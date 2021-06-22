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
import { assertNever } from 'pyright-internal/common/debug';
import { FileSystem } from 'pyright-internal/common/fileSystem';
import {
    combinePaths,
    containsPath,
    ensureTrailingDirectorySeparator,
    getDirectoryPath,
    getFileName,
    normalizePath,
    normalizePathCase,
    resolvePaths,
} from 'pyright-internal/common/pathUtils';
import { Duration } from 'pyright-internal/common/timing';
import { PyrightFileSystem } from 'pyright-internal/pyrightFileSystem';

import {
    addMeasurementsToEvent,
    addNativeModuleInfoToEvent,
    TelemetryEvent,
    TelemetryEventName,
    TelemetryInterface,
} from './common/telemetry';

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

    private _changed = false;

    // Below, "unique" means "a unique way to import a module". For example,
    // the same file imported absolutely, imported absolutely with a different name,
    // imported relatively, or "absolutely" via the import heuristic are all
    // treated as distinct "unique" cases.

    // Overall
    total = 0; // Unique imports.
    stubs = 0; // Unique imports that led to stubs.
    unresolvedTotal = 0; // Unique unresolved imports.

    // Absolute
    absoluteTotal = 0; // Unique absolute imports.
    absoluteStubs = 0; // Unique absolute imports that led to stubs.
    absoluteUnresolved = 0; // Unique absolute imports that didn't resolve.
    absoluteUserUnresolved = 0; // Unique absolute user imports that didn't resolve.

    thirdPartyImportTotal = 0; // Unique absolute imports that resolved to third-party code.
    thirdPartyImportStubs = 0; // Unique absolute imports that resolved to third-party stubs.
    localImportTotal = 0; // Unique absolute imports that resolved to local code.
    localImportStubs = 0; // Unique absolute imports that resolved to local stubs.
    builtinImportTotal = 0; // Unique absolute imports that resolved to builtin code.
    builtinImportStubs = 0; // Unique absolute imports that resolved to builtin stubs.

    // Relative
    relativeTotal = 0; // Unique relative imports.
    relativeStubs = 0; // Unique relative imports that led to stubs.
    relativeUnresolved = 0; // Unique relative imports that didn't resolve.

    constructor(private _resolverId: string) {
        // empty
    }

    setChanged() {
        this._changed = true;
    }

    reset() {
        this.total = 0;
        this.stubs = 0;
        this.unresolvedTotal = 0;
        this.absoluteTotal = 0;
        this.absoluteStubs = 0;
        this.absoluteUnresolved = 0;
        this.absoluteUserUnresolved = 0;
        this.thirdPartyImportTotal = 0;
        this.thirdPartyImportStubs = 0;
        this.localImportTotal = 0;
        this.localImportStubs = 0;
        this.builtinImportTotal = 0;
        this.builtinImportStubs = 0;
        this.relativeTotal = 0;
        this.relativeStubs = 0;
        this.relativeUnresolved = 0;
    }

    addNativeModule(moduleName: string): void {
        if (!this._reportedModules.has(moduleName)) {
            this.setChanged();
            this._currentModules.add(moduleName);
        }
    }

    private _getAndResetNativeModuleNames(): string[] {
        this._currentModules.forEach((m) => this._reportedModules.add(m));
        const moduleNames = [...this._currentModules];
        this._currentModules.clear();
        return moduleNames;
    }

    report(telemetry: TelemetryInterface) {
        if (!this._changed) {
            return;
        }

        this._changed = false;

        //send import metrics
        const importEvent = new TelemetryEvent(TelemetryEventName.IMPORT_METRICS);
        const nativeModules: Set<string> = new Set();

        addMeasurementsToEvent(importEvent, this);

        const nativeModuleNames = this._getAndResetNativeModuleNames();
        if (nativeModuleNames.length > 0) {
            nativeModuleNames.forEach((m) => nativeModules.add(m));

            if (nativeModules.size > 0) {
                addNativeModuleInfoToEvent(importEvent, [...nativeModules]);
            }
        }

        importEvent.Properties['resolverId'] = this._resolverId;
        telemetry.sendTelemetry(importEvent);
    }
}

export class PylanceImportResolver extends ImportResolver {
    private _scrapedTmpFiles = new Map<string, string | false>(); // stubFilePath -> scraped temp file

    private _lastUnresolvedImportName: string | undefined;
    // resolvedPath -> importName
    private _countedAbsolute = new Map<string, Set<string>>();
    private _countedRelative = new Map<string, Set<string>>();

    private readonly _cachedHeuristicResults: ImportHeuristicCache;
    private readonly _importMetrics: ImportMetrics;

    constructor(
        fs: FileSystem,
        configOptions: ConfigOptions,
        resolverId?: number,
        private _console?: ConsoleInterface,
        private _telemetry?: TelemetryInterface
    ) {
        super(fs, configOptions);

        this._cachedHeuristicResults = new ImportHeuristicCache(
            resolverId?.toString() ?? 'N/A',
            (e) => this.getPythonSearchPaths(e, []),
            this._console
        );
        this._importMetrics = new ImportMetrics(resolverId?.toString() ?? 'N/A');
    }

    useImportHeuristic(useImportHeuristic: boolean) {
        // InvalidateCache will be called when this is changed.
        this._cachedHeuristicResults.useImportHeuristic = useImportHeuristic;
    }

    override resolveImport(
        sourceFilePath: string,
        execEnv: ExecutionEnvironment,
        moduleDescriptor: ImportedModuleDescriptor
    ) {
        const importResult = this._resolveImport(sourceFilePath, execEnv, moduleDescriptor);
        this._addResultToImportMetrics(sourceFilePath, execEnv, moduleDescriptor, importResult);
        return importResult;
    }

    private _resolveImport(
        sourceFilePath: string,
        execEnv: ExecutionEnvironment,
        moduleDescriptor: ImportedModuleDescriptor
    ) {
        let importResult = super.resolveImport(sourceFilePath, execEnv, moduleDescriptor);
        if (importResult.isImportFound || moduleDescriptor.leadingDots > 0) {
            return importResult;
        }

        sourceFilePath = normalizePathCase(this.fileSystem, normalizePath(sourceFilePath));
        const origin = ensureTrailingDirectorySeparator(getDirectoryPath(sourceFilePath));

        const importName = this.formatImportName(moduleDescriptor);
        const result = this._cachedHeuristicResults.getImportResult(origin, importName, importResult);
        if (result) {
            // Already ran the heuristic for this import name on this location.
            return this.filterImplicitImports(result, moduleDescriptor.importedSymbols);
        }

        // Check whether the give file is something we care for the heuristic.
        // Keep in sync with _addResultToImportMetrics.
        const root = this._getImportHeuristicRoot(sourceFilePath, execEnv.root);
        if (!this._cachedHeuristicResults.checkValidPath(this.fileSystem, sourceFilePath, root, execEnv)) {
            return importResult;
        }

        this._cachedHeuristicResults.failed(importResult.importFailureInfo);

        const importPath: ImportPath = { importPath: undefined };
        this._cachedHeuristicResults.record(() => {
            // Going up the given folder one by one until we can resolve the import.
            let level = 0;
            let current = origin;
            while (this._shouldWalkUp(current, root, execEnv)) {
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

    override getCompletionSuggestions(
        sourceFilePath: string,
        execEnv: ExecutionEnvironment,
        moduleDescriptor: ImportedModuleDescriptor,
        similarityLimit: number
    ) {
        const suggestions = super.getCompletionSuggestions(sourceFilePath, execEnv, moduleDescriptor, similarityLimit);
        if (this._cachedHeuristicResults.useImportHeuristic) {
            const root = this._getImportHeuristicRoot(sourceFilePath, execEnv.root);
            const origin = ensureTrailingDirectorySeparator(
                getDirectoryPath(normalizePathCase(this.fileSystem, normalizePath(sourceFilePath)))
            );

            let current = origin;
            while (this._shouldWalkUp(current, root, execEnv)) {
                this.getCompletionSuggestionsAbsolute(current, moduleDescriptor, suggestions, similarityLimit);

                current = ensureTrailingDirectorySeparator(
                    normalizePathCase(this.fileSystem, normalizePath(combinePaths(current, '..')))
                );
            }
        }

        return suggestions;
    }

    private _shouldWalkUp(current: string, root: string, execEnv: ExecutionEnvironment) {
        return current.length > root.length || (current === root && !execEnv.root);
    }

    private _getImportHeuristicRoot(sourceFilePath: string, executionRoot: string) {
        if (executionRoot) {
            return ensureTrailingDirectorySeparator(normalizePathCase(this.fileSystem, normalizePath(executionRoot)));
        }

        return ensureTrailingDirectorySeparator(getDirectoryPath(sourceFilePath));
    }

    protected override getTypeshedPathEx(
        execEnv: ExecutionEnvironment,
        importFailureInfo: string[]
    ): string | undefined {
        return getBundledTypeStubsPath(this.fileSystem.getModulePath());
    }

    protected override resolveImportEx(
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

    protected override resolveNativeImportEx(
        libraryFilePath: string,
        importName: string,
        importFailureInfo: string[] = []
    ): string | undefined {
        // We limit resolution to site-packages only.
        if (libraryFilePath.indexOf(nativeModulesRoot) < 0) {
            return;
        }

        this._importMetrics.addNativeModule(importName);
        const nativeStubsPath = getBundledNativeStubsPath(this.fileSystem.getModulePath());
        const stub = this.findNativeStub(libraryFilePath, nativeStubsPath);
        if (stub) {
            return stub;
        }

        const importFailed = `Unable to find stub for native module ${importName}, file ${libraryFilePath} in ${nativeStubsPath}`;
        importFailureInfo.push(importFailed);
        return undefined;
    }

    override invalidateCache() {
        this.sendTelemetry();
        this._importMetrics.reset();
        this._cachedHeuristicResults.reset();

        for (const tmpfile of this._scrapedTmpFiles.values()) {
            if (tmpfile) {
                try {
                    this.fileSystem.unlinkSync(tmpfile);
                    // eslint-disable-next-line no-empty
                } catch (e) {}
            }
        }
        this._scrapedTmpFiles.clear();

        this._lastUnresolvedImportName = undefined;

        this._countedAbsolute.clear();
        this._countedRelative.clear();

        super.invalidateCache();
    }

    sendTelemetry() {
        if (!this._telemetry) {
            return;
        }

        this._importMetrics.report(this._telemetry);
        this._cachedHeuristicResults.report(this._telemetry);
    }

    override getSourceFilesFromStub(
        stubFilePath: string,
        execEnv: ExecutionEnvironment,
        mapCompiled: boolean
    ): string[] {
        if (mapCompiled) {
            // Native stubs in the native stub folder has "pyi" extension but acts like the source file.
            // If the stub is in the native stub folder, return itself.
            const nativeStubsPath = getBundledNativeStubsPath(this.fileSystem.getModulePath());
            if (stubFilePath.startsWith(nativeStubsPath)) {
                return [stubFilePath];
            }
        }

        const files = super.getSourceFilesFromStub(stubFilePath, execEnv, mapCompiled);
        if (files.length > 0) {
            return files;
        }

        if (mapCompiled) {
            const scrapedPath = this._scrapedPath(stubFilePath, execEnv);
            if (scrapedPath) {
                return [scrapedPath];
            }

            if (this.fileSystem instanceof PyrightFileSystem) {
                // If everything failed, See whether we have a partial stub file saved
                // for compiled module doc string.
                const partialStubWithComments = this.fileSystem.getConflictedFile(stubFilePath);
                if (partialStubWithComments) {
                    files.push(partialStubWithComments);
                }
            }
        }

        return files;
    }

    private _addResultToImportMetrics(
        sourceFilePath: string,
        execEnv: ExecutionEnvironment,
        moduleDescriptor: ImportedModuleDescriptor,
        importResult: ImportResult
    ) {
        const importName = this.formatImportName(moduleDescriptor);
        const isRelative = moduleDescriptor.leadingDots > 0;
        const resolvedPath =
            importResult.resolvedPaths.length > 0
                ? importResult.resolvedPaths[importResult.resolvedPaths.length - 1]
                : '';

        // Deduplicate by (resolvedPath, importName) pair; we want to count
        // each individual way to import a module, including cases where the
        // same module may have different absolute names (either via search
        // paths or the import heuristic).
        const nameSet = getOrAdd(
            isRelative ? this._countedRelative : this._countedAbsolute,
            resolvedPath,
            () => new Set()
        );
        const countedImport = nameSet.has(importName);
        if (countedImport) {
            return;
        }

        nameSet.add(importName);

        this._importMetrics.setChanged();

        this._importMetrics.total += 1;
        this._importMetrics.stubs += importResult.isStubFile ? 1 : 0;
        if (isRelative) {
            this._importMetrics.relativeTotal += 1;
            this._importMetrics.relativeStubs += importResult.isStubFile ? 1 : 0;
        } else {
            this._importMetrics.absoluteTotal += 1;
            this._importMetrics.absoluteStubs += importResult.isStubFile ? 1 : 0;
        }

        if (!importResult.isImportFound) {
            // Import was unresolved.

            let newUnresolved = true;

            if (this._lastUnresolvedImportName) {
                const editDistance = importNameEditDistance(
                    this._lastUnresolvedImportName,
                    importName,
                    /* checkDottedPrefix */ true
                );
                if (editDistance < 2) {
                    newUnresolved = false;
                }
            }

            // The below algorithm only works for absolute imports;
            // don't run it on relative imports.
            let userUnresolved = newUnresolved && !isRelative;
            if (userUnresolved) {
                // Match resolveImport's algorithm to check if is user code.
                sourceFilePath = normalizePathCase(this.fileSystem, normalizePath(sourceFilePath));

                const root = this._getImportHeuristicRoot(sourceFilePath, execEnv.root);
                userUnresolved = this._cachedHeuristicResults.checkValidPath(
                    this.fileSystem,
                    sourceFilePath,
                    root,
                    execEnv
                );
            }

            this._lastUnresolvedImportName = importName;
            this._importMetrics.absoluteUserUnresolved += userUnresolved ? 1 : 0;

            this._importMetrics.unresolvedTotal += newUnresolved ? 1 : 0;
            if (isRelative) {
                this._importMetrics.relativeUnresolved += newUnresolved ? 1 : 0;
            } else {
                this._importMetrics.absoluteUnresolved += newUnresolved ? 1 : 0;
            }

            return;
        }

        // Import was resolved.

        if (isRelative) {
            // Relative imports do not have their importType set properly; skip the below.
            return;
        }

        switch (importResult.importType) {
            case ImportType.ThirdParty: {
                this._importMetrics.thirdPartyImportTotal += 1;
                this._importMetrics.thirdPartyImportStubs += importResult.isStubFile ? 1 : 0;
                break;
            }
            case ImportType.Local: {
                this._importMetrics.localImportTotal += 1;
                this._importMetrics.localImportStubs += importResult.isStubFile ? 1 : 0;
                break;
            }
            case ImportType.BuiltIn: {
                this._importMetrics.builtinImportTotal += 1;
                this._importMetrics.builtinImportStubs += importResult.isStubFile ? 1 : 0;
                break;
            }
            default:
                assertNever(importResult.importType);
        }
    }

    private _scrapedPath(stubFilePath: string, execEnv: ExecutionEnvironment): string | undefined {
        if (!this._configOptions.pythonPath) {
            return undefined;
        }

        const stdlib = this.getTypeshedStdLibPath(execEnv);
        if (!stdlib || !containsPath(stdlib, stubFilePath)) {
            return undefined;
        }

        return (
            getOrAdd(this._scrapedTmpFiles, stubFilePath, () => this._scrapeModuleToTmpFile(stubFilePath, execEnv)) ||
            undefined
        );
    }

    private _scrapeModuleToTmpFile(stubFilePath: string, execEnv: ExecutionEnvironment): string | false {
        const { moduleName } = this.getModuleNameForImport(stubFilePath, execEnv);

        try {
            const commandLineArgs: string[] = [
                '-W',
                'ignore', // Don't print warnings to stderr.
                '-B', // Disable generating .pyc caches.
                '-S', // Disable the site module.
                '-I', // Enable "isolated mode", which disables PYTHON* variables, ensures the cwd isn't in sys.path, etc. Python 3.4+
                resolvePaths(this.fileSystem.getModulePath(), 'scripts', 'scrape_module.py'),
                moduleName,
            ];

            const output = child_process.execFileSync(this._configOptions.pythonPath!, commandLineArgs, {
                encoding: 'utf8',
                stdio: ['ignore', 'pipe', 'ignore'],
                timeout: 10000,
            });

            if (!output) {
                return false;
            }

            const tmpfile = this.fileSystem.tmpfile({ prefix: moduleName, postfix: '.py' });
            this.fileSystem.writeFileSync(tmpfile, output, 'utf8');

            return tmpfile;
        } catch {
            return false;
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
    resolverId?: number,
    console?: ConsoleInterface,
    telemetry?: TelemetryInterface
): PylanceImportResolver {
    return new PylanceImportResolver(fs, options, resolverId, console, telemetry);
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

    private _changed = false;

    useImportHeuristic = false;

    constructor(
        private _resolverId: string,
        private _importRootGetter: (exec: ExecutionEnvironment) => string[],
        private _console?: ConsoleInterface
    ) {
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

    checkValidPath(fs: FileSystem, sourceFilePath: string, root: string, exec: ExecutionEnvironment): boolean {
        if (!sourceFilePath.startsWith(root)) {
            // We don't search containing folders for libs.
            return false;
        }

        this._libPathCache =
            this._libPathCache ??
            this._importRootGetter(exec)
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
            const editDistance = importNameEditDistance(this._lastData.importName, scanResult.importName);
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

        this._changed = true;
        this._lastData = scanResult;

        if (scanResult.success && !this.useImportHeuristic) {
            this._console?.log(
                `Failed absolute import '${scanResult.importName}' potentially resolved in parent directory '${scanResult.path}'.`
            );
        }
    }

    report(telemetry: TelemetryInterface) {
        if (!this._changed || (this._cachedHeuristicResults.size === 0 && this._failureReasons.size === 0)) {
            return;
        }

        this._changed = false;

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
        event.Measurements['avgCost'] = total === 0 ? 0 : totalDuration / total;
        event.Measurements['avgLevel'] = succeeded === 0 ? 0 : totalLevel / succeeded;

        for (const [key, value] of this._failureReasons) {
            const measureKey = 'reason_' + key.replace(/ /gi, '_');
            event.Measurements[measureKey] = value;
        }

        event.Properties['resolverId'] = this._resolverId;
        telemetry.sendTelemetry(event);
    }

    reset() {
        this._importChecked.clear();
        this._cachedHeuristicResults.clear();
        this._failureReasons.clear();

        this._libPathCache = undefined;
        this._lastData = undefined;
    }

    private _setFailureReasons(reasons: string[], reason: string) {
        if (reasons.some((r) => r.indexOf(reason) >= 0)) {
            this._failureReasons.set(reason, (this._failureReasons.get(reason) ?? 0) + 1);
        }
    }
}

function importNameEditDistance(word1: string, word2: string, checkDottedPrefix = false) {
    if (word1.length > word2.length) {
        [word1, word2] = [word2, word1];
    }

    if (word2.startsWith(word1) && (!checkDottedPrefix || !word2.startsWith(word1 + '.'))) {
        return 1;
    }

    return leven(word2, word1);
}
