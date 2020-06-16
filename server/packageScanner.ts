/*
 * packageScanner.ts
 *
 * Scan installed packages/modules and Create indices.
 */

import { CancellationToken } from 'vscode-languageserver';

import { ImportResolver } from './pyright/server/src/analyzer/importResolver';
import { isPrivateOrProtectedName } from './pyright/server/src/analyzer/symbolNameUtils';
import { throwIfCancellationRequested } from './pyright/server/src/common/cancellationUtils';
import { ConfigOptions, ExecutionEnvironment } from './pyright/server/src/common/configOptions';
import {
    combinePaths,
    getFileExtension,
    getFileName,
    isFileSystemCaseSensitive,
    stripFileExtension,
} from './pyright/server/src/common/pathUtils';
import { equateStringsCaseInsensitive, equateStringsCaseSensitive } from './pyright/server/src/common/stringUtils';
import { WorkspaceServiceInstance } from './pyright/server/src/languageServerBase';
import {
    FilePath,
    FullImportName,
    ImportName,
    ImportNameMap,
    ImportsMap,
} from './pyright/server/src/languageService/autoImporter';

export class PackageScanner {
    private static _lastPackageCache: { projectRoot: string; scanner: PackageScanner } | undefined;

    static getScanner(workspace: WorkspaceServiceInstance, token: CancellationToken) {
        const configOptions = workspace.serviceInstance.getConfigOptions();
        if (this._lastPackageCache?.projectRoot !== configOptions.projectRoot) {
            const scanner = new PackageScanner(configOptions, workspace.serviceInstance.getImportResolver());

            scanner.scan(token);
            this._lastPackageCache = { projectRoot: configOptions.projectRoot, scanner: scanner };
        }

        return this._lastPackageCache.scanner;
    }

    static invalidateCache() {
        this._lastPackageCache = undefined;
    }

    private _indicesPerExecEnv = new Map<string, ImportNameMap>();

    private _executionEnvironments: ExecutionEnvironment[] = [];
    private _stringComparer: (a: string | undefined, b: string | undefined) => boolean;

    constructor(configOptions: ConfigOptions, private _importResolver: ImportResolver) {
        this._stringComparer = isFileSystemCaseSensitive(this._fs)
            ? equateStringsCaseSensitive
            : equateStringsCaseInsensitive;

        if (configOptions.executionEnvironments.length === 0) {
            this._executionEnvironments.push(
                new ExecutionEnvironment(
                    configOptions.projectRoot,
                    configOptions.defaultPythonVersion,
                    configOptions.defaultPythonPlatform
                )
            );
        } else {
            this._executionEnvironments.push(...configOptions.executionEnvironments);
        }
    }

    getImportNameMap(execEnv: ExecutionEnvironment): ImportNameMap | undefined {
        return this._indicesPerExecEnv.get(execEnv.root);
    }

    scan(token: CancellationToken): void {
        for (const execEnv of this._executionEnvironments) {
            const roots = this._getRoots(execEnv).filter((r) => this._fs.existsSync(r));
            for (const root of roots) {
                for (const current of this._fs.readdirEntriesSync(root)) {
                    throwIfCancellationRequested(token);

                    if (current.isFile()) {
                        if (current.name === '__init__.py' || current.name === '__init__.pyi') {
                            // root can't have __init__ or py file
                            continue;
                        }

                        // Stub file
                        if (getFileExtension(current.name) === '.pyi') {
                            const filePath = combinePaths(root, current.name);
                            const moduleName = this._importResolver.getModuleNameForImport(filePath, execEnv);

                            if (moduleName.moduleName) {
                                this._get(execEnv, stripFileExtension(current.name)).set(
                                    moduleName.moduleName,
                                    filePath
                                );
                            }
                            continue;
                        }
                    }

                    if (current.isDirectory() && !isPrivateOrProtectedName(stripFileExtension(current.name))) {
                        this._scan(roots, execEnv, combinePaths(root, current.name), token);
                    }
                }
            }
        }
    }

    private _scan(roots: string[], execEnv: ExecutionEnvironment, path: string, token: CancellationToken) {
        if (roots.some((r) => this._stringComparer(path, r))) {
            // Don't dig in nested roots. We only care about preserving case sensitivity for
            // part of paths (after import roots) which become python symbols referencing
            // modules. otherwise, we follow os/fs's case sensitivity.
            // PEP 235 (https://www.python.org/dev/peps/pep-0235/)
            return;
        }

        const containsInit = this._fs.existsSync(combinePaths(path, '__init__.py'));
        for (const current of this._fs.readdirEntriesSync(path)) {
            throwIfCancellationRequested(token);

            if (current.isFile()) {
                const filePath = combinePaths(path, current.name);
                const moduleName = this._importResolver.getModuleNameForImport(filePath, execEnv);

                if (!moduleName.moduleName) {
                    continue;
                }

                if (current.name === '__init__.py' || current.name === '__init__.pyi') {
                    this._get(execEnv, getFileName(path)).set(moduleName.moduleName, filePath);
                    continue;
                }

                // Stub file or a python file under a directory that has the init file.
                if (
                    getFileExtension(current.name) === '.pyi' ||
                    (containsInit && getFileExtension(current.name) === '.py')
                ) {
                    this._get(execEnv, stripFileExtension(current.name)).set(moduleName.moduleName, filePath);
                    continue;
                }
            }

            if (current.isDirectory() && !isPrivateOrProtectedName(stripFileExtension(current.name))) {
                this._scan(roots, execEnv, combinePaths(path, current.name), token);
            }
        }
    }

    private _get(execEnv: ExecutionEnvironment, name: string): ImportsMap {
        let map = this._indicesPerExecEnv.get(execEnv.root);
        if (!map) {
            map = new Map<ImportName, ImportsMap>();
            this._indicesPerExecEnv.set(execEnv.root, map);
        }

        let set = map.get(name);
        if (!set) {
            set = new Map<FullImportName, FilePath>();
            map.set(name, set);
        }

        return set;
    }

    private _getRoots(execEnv: ExecutionEnvironment): string[] {
        return this._importResolver
            .getImportRoots(execEnv, /*useTypeshedVersionedFolders*/ false)
            .filter((r) => r !== execEnv.root);
    }

    private get _fs() {
        return this._importResolver.fileSystem;
    }
}
