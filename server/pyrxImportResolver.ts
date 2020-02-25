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

export class PyrxImportResolver extends ImportResolver {
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
}

export function createPyrxImportResolver(fs: VirtualFileSystem, options: ConfigOptions): ImportResolver {
    return new PyrxImportResolver(fs, options);
}
