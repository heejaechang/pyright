/*
 * pylanceImportResolver.ts
 *
 * Extends the base import functionality provided by pyright to provide
 * resolution of additional type stub paths.
 */

import * as child_process from 'child_process';

import { ImportedModuleDescriptor, ImportResolver } from 'pyright-internal/analyzer/importResolver';
import { ImportResult, ImportType } from 'pyright-internal/analyzer/importResult';
import { ConfigOptions, ExecutionEnvironment } from 'pyright-internal/common/configOptions';
import { FileSystem } from 'pyright-internal/common/fileSystem';
import {
    combinePaths,
    ensureTrailingDirectorySeparator,
    getDirectoryPath,
    getFileName,
    normalizePath,
    resolvePaths,
} from 'pyright-internal/common/pathUtils';

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

    readonly importMetrics = new ImportMetrics();

    setStubUsageCallback(callback: ImportMetricsCallback | undefined): void {
        this._onImportMetricsCallback = callback;
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
                    importFailureInfo
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
            if (getFileName(stubFilePath) === 'builtins.pyi') {
                const builtinsPath = this._scrapedBuiltinsPath();
                if (builtinsPath) {
                    return [builtinsPath];
                }
            }
        }

        return super.getSourceFilesFromStub(stubFilePath, execEnv, mapCompiled);
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

export function createPylanceImportResolver(fs: FileSystem, options: ConfigOptions): PylanceImportResolver {
    return new PylanceImportResolver(fs, options);
}
