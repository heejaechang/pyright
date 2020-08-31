/*
 * pylanceImportResolver.ts
 *
 * Extends the base import functionality provided by pyright to provide
 * resolution of additional type stub paths.
 */

import { ImportedModuleDescriptor, ImportResolver } from 'pyright-internal/analyzer/importResolver';
import { ImportResult, ImportType } from 'pyright-internal/analyzer/importResult';
import { ConfigOptions, ExecutionEnvironment } from 'pyright-internal/common/configOptions';
import { FileSystem } from 'pyright-internal/common/fileSystem';
import {
    combinePaths,
    ensureTrailingDirectorySeparator,
    getDirectoryPath,
    normalizePath,
} from 'pyright-internal/common/pathUtils';

function getBundledTypeStubsPath(moduleDirectory?: string) {
    if (moduleDirectory) {
        moduleDirectory = normalizePath(moduleDirectory);
        return combinePaths(getDirectoryPath(ensureTrailingDirectorySeparator(moduleDirectory)), 'bundled-stubs');
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

    //override parents version to send stubStats for clearing the cache
    invalidateCache() {
        if (this._onImportMetricsCallback) {
            this._onImportMetricsCallback(this._importMetrics);
        }
        this._importMetrics = new ImportMetrics();
        super.invalidateCache();
    }

    getAndResetImportMetrics(): ImportMetrics {
        const usage = this._importMetrics;
        this._importMetrics = new ImportMetrics();
        return usage;
    }

    protected _addResultsToCache(
        execEnv: ExecutionEnvironment,
        importName: string,
        importResult: ImportResult,
        importedSymbols: string[] | undefined
    ) {
        this._addResultToImportMetrics(importResult);
        return super._addResultsToCache(execEnv, importName, importResult, importedSymbols);
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
}

export function createPylanceImportResolver(fs: FileSystem, options: ConfigOptions): PylanceImportResolver {
    return new PylanceImportResolver(fs, options);
}
