/*
 * pylanceImportResolver.ts
 *
 * Extends the base import functionality provided by pyright to provide
 * resolution of additional type stub paths.
 */

import * as child_process from 'child_process';
import leven from 'leven';

import { ImportedModuleDescriptor, ImportResolver } from 'pyright-internal/analyzer/importResolver';
import { ImportResult, ImportType } from 'pyright-internal/analyzer/importResult';
import { getOrAdd } from 'pyright-internal/common/collectionUtils';
import { ConfigOptions, ExecutionEnvironment } from 'pyright-internal/common/configOptions';
import { ConsoleInterface } from 'pyright-internal/common/console';
import { FileSystem } from 'pyright-internal/common/fileSystem';
import {
    combinePaths,
    ensureTrailingDirectorySeparator,
    getDirectoryPath,
    getFileName,
    normalizePath,
    normalizePathCase,
    normalizeSlashes,
    resolvePaths,
} from 'pyright-internal/common/pathUtils';
import { Duration } from 'pyright-internal/common/timing';
import { PyrightFileSystem } from 'pyright-internal/pyrightFileSystem';

import { TelemetryEvent, TelemetryEventName, TelemetryInterface } from './common/telemetry';

// Limit native module stub resolution to 'site-packages'
// for both performance and possible PII reasons.
const nativeModulesRoot = 'site-packages';

function getBundledTypeStubsPath(moduleDirectory: string) {
    return getStubsPath(moduleDirectory, 'stubs');
}

function getBundledNativeStubsPath(moduleDirectory: string) {
    return getStubsPath(moduleDirectory, 'native-stubs');
}

function getStubsPath(moduleDirectory: string, stubType: string) {
    moduleDirectory = normalizePath(moduleDirectory);
    return combinePaths(getDirectoryPath(ensureTrailingDirectorySeparator(moduleDirectory)), 'bundled', stubType);
}

export class ImportMetrics {
    private readonly _currentModules: Set<string> = new Set();
    private readonly _reportedModules: Set<string> = new Set();

    thirdPartyImportTotal = 0;
    thirdPartyImportStubs = 0;
    localImportTotal = 0;
    localImportStubs = 0;
    builtinImportTotal = 0;
    builtinImportStubs = 0;

    isEmpty(): boolean {
        return (
            this.thirdPartyImportTotal === 0 &&
            this.thirdPartyImportStubs === 0 &&
            this.localImportTotal === 0 &&
            this.localImportStubs === 0 &&
            this.builtinImportTotal === 0 &&
            this.builtinImportStubs === 0
        );
    }

    public reset() {
        this.thirdPartyImportTotal = 0;
        this.thirdPartyImportStubs = 0;
        this.localImportTotal = 0;
        this.localImportStubs = 0;
        this.builtinImportTotal = 0;
        this.builtinImportStubs = 0;
    }

    public addNativeModule(moduleName: string): void {
        if (!this._reportedModules.has(moduleName)) {
            this._currentModules.add(moduleName);
        }
    }

    public getAndResetNativeModuleNames(): string[] {
        this._currentModules.forEach((m) => this._reportedModules.add(m));
        const moduleNames = [...this._currentModules];
        this._currentModules.clear();
        return moduleNames;
    }
}

export type ImportMetricsCallback = (results: ImportMetrics) => void;

export class PylanceImportResolver extends ImportResolver {
    private _onImportMetricsCallback: ImportMetricsCallback | undefined;
    private _scrapedBuiltinsTempfile: string | undefined;
    private _scrapedBuiltinsFailed = false;

    private readonly _cachedHeuristicResults: ImportHeuristicCache;
    readonly importMetrics = new ImportMetrics();

    constructor(
        fs: FileSystem,
        configOptions: ConfigOptions,
        private _console?: ConsoleInterface,
        private _telemetry?: TelemetryInterface
    ) {
        super(fs, configOptions);

        this._cachedHeuristicResults = new ImportHeuristicCache(this._console);
    }

    setStubUsageCallback(callback: ImportMetricsCallback | undefined): void {
        this._onImportMetricsCallback = callback;
    }

    useImportHeuristic(useImportHeuristic: boolean) {
        // InvalidateCache will be called when this is changed.
        this._cachedHeuristicResults.useImportHeuristic = useImportHeuristic;
    }

    resolveImport(sourceFilePath: string, execEnv: ExecutionEnvironment, moduleDescriptor: ImportedModuleDescriptor) {
        let importResult = super.resolveImport(sourceFilePath, execEnv, moduleDescriptor);
        if (importResult.isImportFound || moduleDescriptor.leadingDots > 0) {
            return importResult;
        }

        sourceFilePath = normalizePathCase(this.fileSystem, normalizePath(sourceFilePath));

        const root = ensureTrailingDirectorySeparator(normalizePathCase(this.fileSystem, normalizePath(execEnv.root)));
        const origin = ensureTrailingDirectorySeparator(getDirectoryPath(sourceFilePath));

        const importName = this.formatImportName(moduleDescriptor);
        const result = this._cachedHeuristicResults.getImportResult(origin, importName, importResult);
        if (result) {
            // Already ran the heuristic for this import name on this location.
            return this.filterImplicitImports(result, moduleDescriptor.importedSymbols);
        }

        // Check whether the give file is something we care for the heuristic.
        if (
            !this._cachedHeuristicResults.checkValidPath(this.fileSystem, sourceFilePath, root, () =>
                this.getImportRoots(execEnv)
            )
        ) {
            return importResult;
        }

        this._cachedHeuristicResults.failed(importResult.importFailureInfo);

        const importPath: ImportPath = { importPath: undefined };
        this._cachedHeuristicResults.record(() => {
            // Going up the given folder one by one until we can resolve the import.
            let level = 0;
            let current = origin;
            while (current.length > root.length) {
                const result = this.resolveAbsoluteImport(
                    current,
                    execEnv,
                    moduleDescriptor,
                    importName,
                    [],
                    /* allowPartial */ undefined,
                    /* allowNativeLib */ undefined,
                    /* useStubPackage */ false,
                    /* allowPyi */ true
                );

                this._cachedHeuristicResults.checked(current, importName, importPath);

                if (result.isImportFound) {
                    // This will make cache to point to actual path that contains the module we found
                    importPath.importPath = current;

                    if (this._cachedHeuristicResults.useImportHeuristic) {
                        // reset the result only if we are using heuristic. otherwise, just send telemetry
                        importResult = this.filterImplicitImports(result, moduleDescriptor.importedSymbols);
                    }

                    return {
                        importResult: result,
                        scanResult: {
                            success: true,
                            path: current,
                            importName,
                            level,
                        },
                    };
                }

                current = ensureTrailingDirectorySeparator(
                    normalizePathCase(this.fileSystem, normalizePath(combinePaths(current, '..')))
                );
                level++;
            }

            this._cachedHeuristicResults.checked(current, importName, importPath);
            return {
                importResult: undefined,
                scanResult: {
                    success: false,
                    path: current,
                    importName,
                    level,
                },
            };
        });

        return importResult;
    }

    getCompletionSuggestions(
        sourceFilePath: string,
        execEnv: ExecutionEnvironment,
        moduleDescriptor: ImportedModuleDescriptor,
        similarityLimit: number
    ) {
        const suggestions = super.getCompletionSuggestions(sourceFilePath, execEnv, moduleDescriptor, similarityLimit);

        if (this._cachedHeuristicResults.useImportHeuristic) {
            const root = ensureTrailingDirectorySeparator(
                normalizePathCase(this.fileSystem, normalizePath(execEnv.root))
            );
            const origin = ensureTrailingDirectorySeparator(
                getDirectoryPath(normalizePathCase(this.fileSystem, normalizePath(sourceFilePath)))
            );

            let current = origin;
            while (current.length > root.length) {
                this.getCompletionSuggestionsAbsolute(current, moduleDescriptor, suggestions, similarityLimit);

                current = ensureTrailingDirectorySeparator(
                    normalizePathCase(this.fileSystem, normalizePath(combinePaths(current, '..')))
                );
            }
        }

        return suggestions;
    }

    protected getTypeshedPathEx(execEnv: ExecutionEnvironment, importFailureInfo: string[]): string | undefined {
        return getBundledTypeStubsPath(this.fileSystem.getModulePath());
    }

    protected resolveImportEx(
        sourceFilePath: string,
        execEnv: ExecutionEnvironment,
        moduleDescriptor: ImportedModuleDescriptor,
        importName: string,
        importFailureInfo: string[] = [],
        allowPyi = true
    ): ImportResult | undefined {
        if (allowPyi) {
            const stubsPath = getBundledTypeStubsPath(this.fileSystem.getModulePath());
            if (stubsPath) {
                importFailureInfo.push(`Looking in bundled stubs path '${stubsPath}'`);
                const result = this.resolveAbsoluteImport(
                    stubsPath,
                    execEnv,
                    moduleDescriptor,
                    importName,
                    importFailureInfo,
                    /* allowPartial */ undefined,
                    /* allowNativeLib */ undefined,
                    /* useStubPackage */ true,
                    allowPyi
                );

                if (result && result.isImportFound) {
                    // We will treat bundled stubs files as "third party".
                    result.importType = ImportType.ThirdParty;
                    return result;
                }
            }
        }
        return undefined;
    }

    protected resolveNativeImportEx(
        libraryFilePath: string,
        importName: string,
        importFailureInfo: string[] = []
    ): string | undefined {
        // We limit resolution to site-packages only.
        if (libraryFilePath.indexOf(nativeModulesRoot) < 0) {
            return;
        }

        this.importMetrics.addNativeModule(importName);
        const nativeStubsPath = getBundledNativeStubsPath(this.fileSystem.getModulePath());
        const stub = this.findNativeStub(libraryFilePath, nativeStubsPath);
        if (stub) {
            return stub;
        }

        const importFailed = `Unable to find stub for native module ${importName}, file ${libraryFilePath} in ${nativeStubsPath}`;
        importFailureInfo.push(importFailed);
    }

    invalidateCache() {
        if (this._onImportMetricsCallback) {
            this._onImportMetricsCallback(this.importMetrics);
        }
        this.importMetrics.reset();

        if (this._telemetry) {
            this._cachedHeuristicResults.report(this._telemetry);
        }
        this._cachedHeuristicResults.reset();

        if (this._scrapedBuiltinsTempfile) {
            try {
                this.fileSystem.unlinkSync(this._scrapedBuiltinsTempfile);
                // eslint-disable-next-line no-empty
            } catch (e) {}

            this._scrapedBuiltinsTempfile = undefined;
            this._scrapedBuiltinsFailed = false;
        }

        super.invalidateCache();
    }

    getSourceFilesFromStub(stubFilePath: string, execEnv: ExecutionEnvironment, mapCompiled: boolean): string[] {
        // At the moment, source file mapping is filename to filename. If we want to support compiled
        // modules more generally, we should pass down the full module information, look for the source
        // file, and if it doesn't exist, give the real module name to the scraper. The below special
        // cases this as a proof-of-concept to only handle builtins.pyi.
        if (mapCompiled) {
            // See SourceFile for this method of checking the file indentity as a builtin.
            if (stubFilePath.endsWith(normalizeSlashes('stdlib/builtins.pyi'))) {
                const builtinsPath = this._scrapedBuiltinsPath();
                if (builtinsPath) {
                    return [builtinsPath];
                }
            }
        }

        const files = super.getSourceFilesFromStub(stubFilePath, execEnv, mapCompiled);
        if (files.length > 0) {
            return files;
        }

        // If everything failed, See whether we have a partial stub file saved
        // for compiled module doc string.
        if (mapCompiled && this.fileSystem instanceof PyrightFileSystem) {
            const partialStubWithComments = this.fileSystem.getConflictedFile(stubFilePath);
            if (partialStubWithComments) {
                files.push(partialStubWithComments);
            }
        }

        return files;
    }

    protected addResultsToCache(
        execEnv: ExecutionEnvironment,
        importName: string,
        importResult: ImportResult,
        importedSymbols: string[] | undefined
    ) {
        this._addResultToImportMetrics(importResult);
        return super.addResultsToCache(execEnv, importName, importResult, importedSymbols);
    }

    private _addResultToImportMetrics(importResult: ImportResult) {
        if (importResult === undefined || !importResult.isImportFound) {
            return;
        }

        switch (importResult.importType) {
            case ImportType.ThirdParty: {
                this.importMetrics.thirdPartyImportTotal += 1;
                this.importMetrics.thirdPartyImportStubs += importResult.isStubFile ? 1 : 0;
                break;
            }
            case ImportType.Local: {
                this.importMetrics.localImportTotal += 1;
                this.importMetrics.localImportStubs += importResult.isStubFile ? 1 : 0;
                break;
            }
            case ImportType.BuiltIn: {
                this.importMetrics.builtinImportTotal += 1;
                this.importMetrics.builtinImportStubs += importResult.isStubFile ? 1 : 0;
                break;
            }
            default: {
                break;
            }
        }
    }

    private _scrapedBuiltinsPath(): string | undefined {
        if (this._scrapedBuiltinsFailed) {
            return undefined;
        }

        if (this._scrapedBuiltinsTempfile) {
            return this._scrapedBuiltinsTempfile;
        }

        if (!this._configOptions.pythonPath) {
            return undefined;
        }

        try {
            const commandLineArgs: string[] = [
                '-W',
                'ignore',
                '-B',
                '-E',
                resolvePaths(this.fileSystem.getModulePath(), 'scripts', 'scrape_module.py'),
            ];

            const output = child_process.execFileSync(this._configOptions.pythonPath, commandLineArgs, {
                encoding: 'utf8',
                stdio: ['ignore', 'pipe', 'ignore'],
                timeout: 10000,
            });

            if (!output) {
                this._scrapedBuiltinsFailed = true;
                return undefined;
            }

            const tmpfile = this.fileSystem.tmpfile({ prefix: 'builtins', postfix: '.py' });
            this.fileSystem.writeFileSync(tmpfile, output, 'utf8');

            this._scrapedBuiltinsTempfile = tmpfile;
            this._scrapedBuiltinsFailed = false;
            return this._scrapedBuiltinsTempfile;
        } catch (e) {
            this._scrapedBuiltinsFailed = true;
            return undefined;
        }
    }

    private findNativeStub(libraryFilePath: string, nativeStubsPath: string): string | undefined {
        // Maps native module path under nativeModulesRoot to pre-scraped stubs.
        // libraryFilePath: .../site-packages/numpy/core/_multiarray_umath.cp36-win_amd64.pyd
        // stubPath: bundled/native-stubs/numpy/core/_multiarray_umath.pyi
        const nativeRootIndex = libraryFilePath.indexOf(nativeModulesRoot);
        if (nativeRootIndex < 0) {
            return;
        }
        // numpy/core/_multiarray_umath.cp36-win_amd64.pyd
        const pathUnderNativeRoot = libraryFilePath.substr(nativeRootIndex + nativeModulesRoot.length + 1);
        // _multiarray_umath.cp36-win_amd64.pyd
        const fileName = getFileName(pathUnderNativeRoot);
        // _multiarray_umath
        const moduleName = this.getNativeModuleName(fileName);
        if (!moduleName) {
            return;
        }
        const moduleFolder = getDirectoryPath(pathUnderNativeRoot);
        // bundled/native-stubs/numpy/core/_multiarray_umath.pyi
        const stubFilePath = combinePaths(nativeStubsPath, moduleFolder, `${moduleName}.pyi`);
        return this.fileSystem.existsSync(stubFilePath) ? stubFilePath : undefined;
    }
}

export function createPylanceImportResolver(
    fs: FileSystem,
    options: ConfigOptions,
    console?: ConsoleInterface,
    telemetry?: TelemetryInterface
): PylanceImportResolver {
    return new PylanceImportResolver(fs, options, console, telemetry);
}

interface ScanResult {
    success: boolean;
    path: string;
    importName: string;
    level: number;
    durationInMS?: number;
}

type ImportPath = { importPath: string | undefined };
type CacheEntry = { importResult: ImportResult | undefined; scanResult: ScanResult };

class ImportHeuristicCache {
    private readonly _duration = new Duration();

    private readonly _importChecked = new Map<string, Map<string, ImportPath>>();
    private readonly _cachedHeuristicResults = new Map<string, Map<string, CacheEntry>>();
    private readonly _failureReasons = new Map<string, number>();

    private _lastData: ScanResult | undefined;
    private _libPathCache: string[] | undefined = undefined;

    useImportHeuristic = false;

    constructor(private _console?: ConsoleInterface) {
        // empty
    }

    getImportResult(path: string, importName: string, importResult: ImportResult): ImportResult | undefined {
        const entry = this._cachedHeuristicResults.get(importName)?.get(path);
        if (entry) {
            // We already checked for the importName at the path.
            // Return the result if succeeded otherwise, return regular import result given.
            return (this.useImportHeuristic ? entry.importResult : importResult) ?? importResult;
        }

        const checked = this._importChecked.get(importName)?.get(path);
        if (checked) {
            // We already checked for the importName at the path.
            if (!checked.importPath) {
                return importResult;
            }

            return (
                (this.useImportHeuristic
                    ? this._cachedHeuristicResults.get(importName)?.get(checked.importPath)?.importResult
                    : importResult) ?? importResult
            );
        }

        return undefined;
    }

    checkValidPath(fs: FileSystem, sourceFilePath: string, root: string, importRootGetter: () => string[]): boolean {
        if (!sourceFilePath.startsWith(root)) {
            // We don't search containing folders for libs.
            return false;
        }

        this._libPathCache =
            this._libPathCache ??
            importRootGetter()
                .map((r) => ensureTrailingDirectorySeparator(normalizePathCase(fs, normalizePath(r))))
                .filter((r) => r !== root)
                .filter((r) => r.startsWith(root));

        if (this._libPathCache.some((p) => sourceFilePath.startsWith(p))) {
            // Make sure it is not lib folders under user code root.
            // ex) .venv folder
            return false;
        }

        return true;
    }

    failed(reasons?: string[]) {
        if (!reasons) {
            return;
        }

        this._setFailureReasons(reasons, 'Did not find file');
        this._setFailureReasons(reasons, 'No python interpreter search path');
        this._setFailureReasons(reasons, 'Typeshed path not found');
        this._setFailureReasons(reasons, 'Invalid relative path');
        this._setFailureReasons(reasons, 'because it is not a valid directory');
        this._setFailureReasons(reasons, 'Found no valid directories');
        this._setFailureReasons(reasons, 'Could not parse output');
    }

    checked(path: string, importName: string, importPath: ImportPath) {
        getOrAdd(this._importChecked, importName, () => new Map<string, ImportPath>()).set(path, importPath);
    }

    record(callback: () => CacheEntry) {
        const start = this._duration.getDurationInMilliseconds();
        const result = callback();
        const scanResult = result.scanResult;

        scanResult.durationInMS = this._duration.getDurationInMilliseconds() - start;
        if (this._lastData && !this._lastData.success) {
            const editDistance = this._editDistance(this._lastData.importName, scanResult.importName);
            if (editDistance < 2) {
                // Remove old one.
                const importName = this._lastData.importName;
                const map = this._cachedHeuristicResults.get(importName);
                if (map) {
                    const path = this._lastData.path;
                    const entry = map.get(path);
                    if (entry) {
                        map.delete(path);
                    }

                    if (map.size === 0) {
                        this._cachedHeuristicResults.delete(importName);
                    }
                }
            }
        }

        getOrAdd(this._cachedHeuristicResults, scanResult.importName, () => new Map<string, CacheEntry>()).set(
            scanResult.path,
            result
        );

        this._lastData = scanResult;

        if (scanResult.success && !this.useImportHeuristic) {
            this._console?.log(
                `Failed absolute import '${scanResult.importName}' potentially resolved in parent directory '${scanResult.path}'.`
            );
        }
    }

    report(telemetry: TelemetryInterface) {
        if (this._cachedHeuristicResults.size === 0 && this._failureReasons.size === 0) {
            return;
        }

        let succeeded = 0;
        let failed = 0;
        let conflicts = 0;

        let totalDuration = 0;
        let totalLevel = 0;

        for (const map of this._cachedHeuristicResults.values()) {
            if (map.size > 1) {
                conflicts++;
            }

            for (const value of map.values()) {
                totalDuration += value.scanResult.durationInMS ?? 0;

                if (value.scanResult.success) {
                    succeeded++;
                    totalLevel += value.scanResult.level;
                } else {
                    failed++;
                }
            }
        }

        const total = succeeded + failed;
        const event = new TelemetryEvent(TelemetryEventName.IMPORT_HEURISTIC);

        event.Measurements['total'] = total;
        event.Measurements['success'] = succeeded;
        event.Measurements['conflicts'] = conflicts;
        event.Measurements['avgCost'] = totalDuration / total;
        event.Measurements['avgLevel'] = totalLevel / succeeded;

        for (const [key, value] of this._failureReasons) {
            const measureKey = 'reason_' + key.replace(/ /gi, '_');
            event.Measurements[measureKey] = value;
        }

        telemetry.sendTelemetry(event);
    }

    reset() {
        this._importChecked.clear();
        this._cachedHeuristicResults.clear();
        this._failureReasons.clear();

        this._libPathCache = undefined;
        this._lastData = undefined;
    }

    private _editDistance(word1: string, word2: string) {
        if (word1.length > word2.length) {
            [word1, word2] = [word2, word1];
        }

        if (word2.startsWith(word1)) {
            return 1;
        }

        return leven(word2, word1);
    }

    private _setFailureReasons(reasons: string[], reason: string) {
        if (reasons.some((r) => r.indexOf(reason) >= 0)) {
            this._failureReasons.set(reason, (this._failureReasons.get(reason) ?? 0) + 1);
        }
    }
}
