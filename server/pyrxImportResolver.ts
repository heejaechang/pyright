/*
 * pyrxImportResolver.ts
 *
 * Extends the base import functionality provided by pyright to provide
 * resolution of additional type stub paths.
 */

import { ConfigOptions, ExecutionEnvironment } from './pyright/server/src/common/configOptions';
import { ImportResolver, ImportedModuleDescriptor } from './pyright/server/src/analyzer/importResolver';
import { ImportResult, ImportType } from './pyright/server/src/analyzer/importResult';
import { VirtualFileSystem } from './pyright/server/src/common/vfs';
import {
    normalizePath,
    getDirectoryPath,
    ensureTrailingDirectorySeparator,
    combinePaths
} from './pyright/server/src/common/pathUtils';

function getBundledTypeStubsPath(moduleDirectory?: string) {
    if (moduleDirectory) {
        moduleDirectory = normalizePath(moduleDirectory);
        return combinePaths(getDirectoryPath(ensureTrailingDirectorySeparator(moduleDirectory)), 'bundled-stubs');
    }

    return undefined;
}

export class ImportMetrics {
    missingImports = 0;
    thirdPartyImportsTotal = 0;
    thirdPartyImportStubs = 0;
    localImportsTotal = 0;
    localImportStubs = 0;
    builtinImportsTotal = 0;
    builtinImportStubs = 0;

    isEmpty(): boolean {
        return (
            this.missingImports === 0 &&
            this.thirdPartyImportsTotal === 0 &&
            this.thirdPartyImportStubs === 0 &&
            this.localImportsTotal === 0 &&
            this.localImportStubs === 0 &&
            this.builtinImportsTotal === 0 &&
            this.builtinImportStubs === 0
        );
    }
}

export type ImportMetricsCallback = (results: ImportMetrics) => void;

export class PyrxImportResolver extends ImportResolver {
    protected _importMetrics = new ImportMetrics();
    private _onImportMetricsCallback: ImportMetricsCallback | undefined;

    setStubUsageCallback(callback: ImportMetricsCallback | undefined): void {
        this._onImportMetricsCallback = callback;
    }

    protected resolveImportEx(
        sourceFilePath: string,
        execEnv: ExecutionEnvironment,
        moduleDescriptor: ImportedModuleDescriptor,
        importName: string,
        importFailureInfo: string[] = []
    ): ImportResult | undefined {
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
        if (importResult === undefined) {
            return;
        }

        if (!importResult.isImportFound) {
            this._importMetrics.missingImports += 1;
            return;
        }

        switch (importResult.importType) {
            case ImportType.ThirdParty: {
                this._importMetrics.thirdPartyImportsTotal += 1;
                this._importMetrics.thirdPartyImportStubs += importResult.isStubFile ? 1 : 0;
                break;
            }
            case ImportType.Local: {
                this._importMetrics.localImportsTotal += 1;
                this._importMetrics.localImportStubs += importResult.isStubFile ? 1 : 0;
                break;
            }
            case ImportType.BuiltIn: {
                this._importMetrics.builtinImportsTotal += 1;
                this._importMetrics.builtinImportStubs += importResult.isStubFile ? 1 : 0;
                break;
            }
            default: {
                break;
            }
        }
    }
}

export function createPyrxImportResolver(fs: VirtualFileSystem, options: ConfigOptions): PyrxImportResolver {
    return new PyrxImportResolver(fs, options);
}
