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

function getBundledTypeStubsPath(moduleDirectory?: string) {
    if (moduleDirectory) {
        moduleDirectory = normalizePath(moduleDirectory);
        return combinePaths(getDirectoryPath(ensureTrailingDirectorySeparator(moduleDirectory)), 'bundled', 'stubs');
    }

    return undefined;
}

export class ImportMetrics {
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
}

export type ImportMetricsCallback = (results: ImportMetrics) => void;

export class PylanceImportResolver extends ImportResolver {
    private _importMetrics = new ImportMetrics();
    private _onImportMetricsCallback: ImportMetricsCallback | undefined;
    private _scrapedBuiltinsTempfile: string | undefined;
    private _scrapedBuiltinsFailed = false;

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
                const result = this.resolveAbsoluteImport(stubsPath, moduleDescriptor, importName, importFailureInfo);
                if (result && result.isImportFound) {
                    // We will treat bundled stubs files as "third party".
                    result.importType = ImportType.ThirdParty;
                    return result;
                }
            }
        }
        return undefined;
    }

    invalidateCache() {
        if (this._onImportMetricsCallback) {
            this._onImportMetricsCallback(this._importMetrics);
        }
        this._importMetrics = new ImportMetrics();

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

    getAndResetImportMetrics(): ImportMetrics {
        const usage = this._importMetrics;
        this._importMetrics = new ImportMetrics();
        return usage;
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
}

export function createPylanceImportResolver(fs: FileSystem, options: ConfigOptions): PylanceImportResolver {
    return new PylanceImportResolver(fs, options);
}
