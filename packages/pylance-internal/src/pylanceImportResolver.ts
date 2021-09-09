/*
 * pylanceImportResolver.ts
 *
 * Extends the base import functionality provided by pyright to provide
 * resolution of additional type stub paths.
 */

import leven from 'leven';

import {
    ImportedModuleDescriptor,
    ImportResolver,
    supportedFileExtensions,
} from 'pyright-internal/analyzer/importResolver';
import { ImportResult, ImportType } from 'pyright-internal/analyzer/importResult';
import * as PythonPathUtils from 'pyright-internal/analyzer/pythonPathUtils';
import { getOrAdd } from 'pyright-internal/common/collectionUtils';
import { ConfigOptions, ExecutionEnvironment } from 'pyright-internal/common/configOptions';
import { assertNever } from 'pyright-internal/common/debug';
import { FileSystem } from 'pyright-internal/common/fileSystem';
import { Host, HostKind } from 'pyright-internal/common/host';
import {
    combinePaths,
    containsPath,
    ensureTrailingDirectorySeparator,
    getDirectoryPath,
    getFileExtension,
    getFileName,
    getFileSystemEntriesFromDirEntries,
    isDiskPathRoot,
    normalizePath,
    normalizePathCase,
} from 'pyright-internal/common/pathUtils';
import { PyrightFileSystem } from 'pyright-internal/pyrightFileSystem';

import { IS_DEV, IS_INSIDERS, IS_PR } from './common/constants';
import type { PylanceFullAccessHost } from './common/pylanceFullAccessHost';
import {
    addMeasurementsToEvent,
    hashModuleNamesAndAddToEvent,
    hashString,
    TelemetryEvent,
    TelemetryEventName,
    TelemetryInterface,
} from './common/telemetry';

// Limit native module stub resolution to 'site-packages'
// for both performance and possible PII reasons.
const sitePackagesRoot = 'site-packages';
const distPackagesRoot = 'dist-packages';

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

const MaxModuleThreshold = 100;

export class ImportMetrics {
    private readonly _currentNativeModules: Set<string> = new Set();
    private readonly _reportedNativeModules: Set<string> = new Set();

    private readonly _currentUnresolvedModules: Set<string> = new Set();
    private readonly _reportedUnresolvedModules: Set<string> = new Set();

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
        this._addModule(this._reportedNativeModules, this._currentNativeModules, moduleName);
    }

    addUnresolvedModule(moduleName: string): void {
        if (IS_INSIDERS || IS_DEV || IS_PR) {
            this._addModule(this._reportedUnresolvedModules, this._currentUnresolvedModules, moduleName);
        }
    }

    private _addModule(reported: Set<string>, current: Set<string>, moduleName: string) {
        if (reported.size > MaxModuleThreshold || current.size > MaxModuleThreshold) {
            return;
        }

        if (!reported.has(moduleName)) {
            this.setChanged();
            current.add(moduleName);
        }
    }

    private _getAndResetModuleNames(reported: Set<string>, current: Set<string>): string[] {
        current.forEach((m) => reported.add(m));
        const moduleNames = [...current];
        current.clear();
        return moduleNames;
    }

    report(telemetry: TelemetryInterface) {
        if (!this._changed) {
            return;
        }

        this._changed = false;

        //send import metrics
        const importEvent = new TelemetryEvent(TelemetryEventName.IMPORT_METRICS);
        addMeasurementsToEvent(importEvent, this);

        addModuleNamesToEvent(
            'Native',
            this._getAndResetModuleNames(this._reportedNativeModules, this._currentNativeModules)
        );
        addModuleNamesToEvent(
            'Unresolved',
            this._getAndResetModuleNames(this._reportedUnresolvedModules, this._currentUnresolvedModules)
        );

        importEvent.Properties['resolverId'] = this._resolverId;
        telemetry.sendTelemetry(importEvent);

        function addModuleNamesToEvent(key: string, moduleNames: string[]) {
            if (moduleNames.length > 0) {
                hashModuleNamesAndAddToEvent(importEvent, key, moduleNames, key === 'Unresolved');
            }
        }
    }
}

export class PylanceImportResolver extends ImportResolver {
    private _scrapedTmpFiles = new Map<string, string | false>(); // stubFilePath -> scraped temp file

    private _installedPackagesReported = false;
    private _lastUnresolvedImportName: string | undefined;

    // resolvedPath -> importName
    private _countedAbsolute = new Map<string, Set<string>>();
    private _countedRelative = new Map<string, Set<string>>();

    private readonly _cachedHeuristicResults: ImportHeuristicCache;
    private readonly _importMetrics: ImportMetrics;
    private readonly _resolverId: string;

    constructor(
        fs: FileSystem,
        configOptions: ConfigOptions,
        host: Host,
        resolverId?: number,
        private _telemetry?: TelemetryInterface
    ) {
        super(fs, configOptions, host);

        this._resolverId = resolverId?.toString() ?? 'N/A';

        this._cachedHeuristicResults = new ImportHeuristicCache((e) => this.getPythonSearchPaths(e, []));
        this._importMetrics = new ImportMetrics(this._resolverId);
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

    protected override _resolveImport(
        sourceFilePath: string,
        execEnv: ExecutionEnvironment,
        moduleDescriptor: ImportedModuleDescriptor
    ) {
        const importResult = super._resolveImport(sourceFilePath, execEnv, moduleDescriptor);
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

        const importPath: ImportPath = { importPath: undefined };

        // Going up the given folder one by one until we can resolve the import.
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

                this._cachedHeuristicResults.add({
                    importResult: result,
                    path: current,
                    importName,
                });

                return this.filterImplicitImports(result, moduleDescriptor.importedSymbols);
            }

            let success;
            [success, current] = this._tryWalkUp(current);
            if (!success) {
                break;
            }
        }

        this._cachedHeuristicResults.checked(current, importName, importPath);
        return importResult;
    }

    private _tryWalkUp(current: string): [success: boolean, path: string] {
        if (isDiskPathRoot(current)) {
            return [false, ''];
        }

        return [
            true,
            ensureTrailingDirectorySeparator(
                normalizePathCase(this.fileSystem, normalizePath(combinePaths(current, '..')))
            ),
        ];
    }

    override getCompletionSuggestions(
        sourceFilePath: string,
        execEnv: ExecutionEnvironment,
        moduleDescriptor: ImportedModuleDescriptor
    ) {
        const suggestions = super.getCompletionSuggestions(sourceFilePath, execEnv, moduleDescriptor);

        const root = this._getImportHeuristicRoot(sourceFilePath, execEnv.root);
        const origin = ensureTrailingDirectorySeparator(
            getDirectoryPath(normalizePathCase(this.fileSystem, normalizePath(sourceFilePath)))
        );

        let current = origin;
        while (this._shouldWalkUp(current, root, execEnv)) {
            this.getCompletionSuggestionsAbsolute(current, moduleDescriptor, suggestions, sourceFilePath, execEnv);

            let success;
            [success, current] = this._tryWalkUp(current);
            if (!success) {
                break;
            }
        }

        return suggestions;
    }

    private _shouldWalkUp(current: string, root: string, execEnv: ExecutionEnvironment) {
        return current.length > root.length || (current === root && !execEnv.root);
    }

    private _getImportHeuristicRoot(sourceFilePath: string, executionRoot: string | undefined) {
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
        // We limit resolution to site-packages and dist-packages only.
        // numpy/core/_multiarray_umath.cp36-win_amd64.pyd
        const pathUnderNativeRoot = getPathUnderPackagesRoot(libraryFilePath);
        if (!pathUnderNativeRoot) {
            return undefined;
        }

        if (this._telemetry) {
            this._importMetrics.addNativeModule(importName);
        }

        const nativeStubsPath = getBundledNativeStubsPath(this.fileSystem.getModulePath());
        const stub = this.findNativeStub(pathUnderNativeRoot, nativeStubsPath);
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
        this._installedPackagesReported = false;

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

        this._sendInstalledPackagesTelemetry(this._telemetry);
        this._importMetrics.report(this._telemetry);
    }

    private _sendInstalledPackagesTelemetry(telemetry: TelemetryInterface) {
        if (this._installedPackagesReported || !(IS_INSIDERS || IS_DEV || IS_PR)) {
            return;
        }

        const typeshedRoot = PythonPathUtils.getTypeShedFallbackPath(this.fileSystem);
        const bundledRoot = getBundledTypeStubsPath(this.fileSystem.getModulePath());

        // report installed packages.
        const packages = new Set<string>();
        for (const execEnv of this._configOptions.getExecutionEnvironments()) {
            for (const root of this.getImportRoots(execEnv)) {
                try {
                    if (
                        (typeshedRoot && root.startsWith(typeshedRoot)) ||
                        (bundledRoot && root.startsWith(bundledRoot))
                    ) {
                        // we only care actual installed libraries not stub packages.
                        continue;
                    }

                    const entries = getFileSystemEntriesFromDirEntries(
                        this.readdirEntriesCached(root),
                        this.fileSystem,
                        root
                    );

                    for (const file of entries.files) {
                        const fileExtension = getFileExtension(file, /* multiDotExtension */ false).toLowerCase();
                        if (supportedFileExtensions.some((ext) => ext === fileExtension)) {
                            const packageName = this.getModuleNameFromPath(root, combinePaths(root, file));
                            if (packageName) {
                                packages.add(packageName);
                            }
                        }
                    }

                    for (const dir of entries.directories) {
                        if (dir === '__pycache__') {
                            continue;
                        }

                        const packageName = this.getModuleNameFromPath(
                            root,
                            combinePaths(root, combinePaths(root, dir))
                        );
                        if (packageName) {
                            packages.add(packageName);
                        }
                    }
                } catch {
                    // ignore
                }
            }
        }

        const installedPackageEvent = new TelemetryEvent(TelemetryEventName.INSTALLED_PACKAGES);

        installedPackageEvent.Properties['Packages'] = [...packages.values()].map((n) => hashString(n)).join(' ');
        installedPackageEvent.Properties['PackagesLowerCase'] = [...packages.values()]
            .map((n) => hashString(n.toLowerCase()))
            .join(' ');

        installedPackageEvent.Properties['resolverId'] = this._resolverId;
        telemetry.sendTelemetry(installedPackageEvent);

        this._installedPackagesReported = true;
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
        if (mapCompiled) {
            if (files.length > 0) {
                // Special cases:
                // - decimal: potentially re-exports from compiled modules, but isn't stubbed that way.
                // - ntpath/posixpath: splitext.__doc__ is populated at runtime from genericpath.splittext.
                if (!/stdlib[\\/](decimal|ntpath|posixpath)\.pyi/.test(stubFilePath)) {
                    return files;
                }
            }

            if (this._isScrapable(stubFilePath, execEnv)) {
                const scrapedPath = this._scrapedPath(stubFilePath, execEnv);
                if (scrapedPath) {
                    files.push(scrapedPath);
                    return files;
                }
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

            if (userUnresolved && this._telemetry) {
                this._importMetrics.addUnresolvedModule(importName);
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

    private _isScrapable(stubFilePath: string, execEnv: ExecutionEnvironment): boolean {
        if (!this._configOptions.pythonPath) {
            return false;
        }

        const stdlib = this.getTypeshedStdLibPath(execEnv);
        if (!stdlib || !containsPath(stdlib, stubFilePath)) {
            return false;
        }

        return true;
    }

    private _scrapedPath(stubFilePath: string, execEnv: ExecutionEnvironment): string | undefined {
        return (
            getOrAdd(this._scrapedTmpFiles, stubFilePath, () => this._scrapeModuleToTmpFile(stubFilePath, execEnv)) ||
            undefined
        );
    }

    private _scrapeModuleToTmpFile(stubFilePath: string, execEnv: ExecutionEnvironment): string | false {
        const { moduleName } = this.getModuleNameForImport(stubFilePath, execEnv);

        try {
            if (this.host.kind !== HostKind.FullAccess) {
                return false;
            }

            const output = (this.host as PylanceFullAccessHost).scrapeModuleFromPython(
                moduleName,
                this._configOptions.pythonPath!
            );

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

    private findNativeStub(pathUnderNativeRoot: string, nativeStubsPath: string): string | undefined {
        // Maps native module path under nativeModulesRoot to pre-scraped stubs.
        // pathUnderNativeRoot: numpy/core/_multiarray_umath.cp36-win_amd64.pyd
        // stubPath: bundled/native-stubs/numpy/core/_multiarray_umath.pyi
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
    host: Host,
    resolverId?: number,
    telemetry?: TelemetryInterface
): PylanceImportResolver {
    return new PylanceImportResolver(fs, options, host, resolverId, telemetry);
}

type ImportPath = { importPath: string | undefined };
type CacheEntry = { importResult: ImportResult; path: string; importName: string };

class ImportHeuristicCache {
    private readonly _importChecked = new Map<string, Map<string, ImportPath>>();
    private readonly _cachedHeuristicResults = new Map<string, Map<string, ImportResult>>();

    private _libPathCache: string[] | undefined = undefined;

    constructor(private _importRootGetter: (exec: ExecutionEnvironment) => string[]) {
        // empty
    }

    getImportResult(path: string, importName: string, importResult: ImportResult): ImportResult | undefined {
        const result = this._cachedHeuristicResults.get(importName)?.get(path);
        if (result) {
            // We already checked for the importName at the path.
            // Return the result if succeeded otherwise, return regular import result given.
            return result ?? importResult;
        }

        const checked = this._importChecked.get(importName)?.get(path);
        if (checked) {
            // We already checked for the importName at the path.
            if (!checked.importPath) {
                return importResult;
            }

            return this._cachedHeuristicResults.get(importName)?.get(checked.importPath) ?? importResult;
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

    checked(path: string, importName: string, importPath: ImportPath) {
        getOrAdd(this._importChecked, importName, () => new Map<string, ImportPath>()).set(path, importPath);
    }

    add(result: CacheEntry) {
        getOrAdd(this._cachedHeuristicResults, result.importName, () => new Map<string, ImportResult>()).set(
            result.path,
            result.importResult
        );
    }

    reset() {
        this._importChecked.clear();
        this._cachedHeuristicResults.clear();
        this._libPathCache = undefined;
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

function getPathUnderPackagesRoot(libraryFilePath: string) {
    let nativeRootIndex = libraryFilePath.indexOf(sitePackagesRoot);
    let rootLength = sitePackagesRoot.length;
    if (nativeRootIndex < 0) {
        nativeRootIndex = libraryFilePath.indexOf(distPackagesRoot);
        rootLength = distPackagesRoot.length;
    }

    if (nativeRootIndex < 0) {
        return undefined;
    }

    const pathUnderNativeRoot = libraryFilePath.substr(nativeRootIndex + rootLength + 1);
    return pathUnderNativeRoot;
}
