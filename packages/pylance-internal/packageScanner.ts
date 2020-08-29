/*
 * packageScanner.ts
 *
 * Scan installed packages/modules and Create indices.
 */

import { CancellationToken } from 'vscode-languageserver';

import { ImportResolver } from './pyright/server/src/analyzer/importResolver';
import { stdLibFolderName } from './pyright/server/src/analyzer/pythonPathUtils';
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

export type ImportName = string;
export type FullImportName = string;

export interface PackageInfo {
    stdLib: boolean;
    isStub: boolean;
    filePath: string;
    shadowed: boolean;
}

export type ImportsMap = Map<FullImportName, PackageInfo>;
export type ImportNameMap = Map<ImportName, ImportsMap>;

export class PackageScanner {
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

    getModuleFilesPerExecEnv() {
        // Indices is organized by module names. Regroup them
        // by module file path.
        const map = new Map<string, string[]>();
        for (const [execEnvRoot, nameMap] of this._indicesPerExecEnv) {
            const set = new Set<string>();
            for (const [_, moduleMap] of nameMap) {
                for (const [_, packageInfo] of moduleMap) {
                    if (!packageInfo.stdLib && packageInfo.isStub && !packageInfo.shadowed) {
                        // filter out any third party library stubs that doesn't have corresponding
                        // library installed in current execution environment.
                        continue;
                    }

                    set.add(packageInfo.filePath);
                }
            }

            map.set(execEnvRoot, [...set]);
        }

        return map;
    }

    scan(token: CancellationToken): void {
        for (const execEnv of this._executionEnvironments) {
            const roots = this._getRoots(execEnv).filter((r) => this._fs.existsSync(r));
            for (const root of roots) {
                for (const fileEntry of this._fs.readdirEntriesSync(root)) {
                    throwIfCancellationRequested(token);

                    if (fileEntry.isFile()) {
                        if (fileEntry.name === '__init__.py' || fileEntry.name === '__init__.pyi') {
                            // root can't have __init__ or py file
                            continue;
                        }

                        // Stub file
                        if (getFileExtension(fileEntry.name) === '.pyi') {
                            const filePath = combinePaths(root, fileEntry.name);
                            const moduleName = this._importResolver.getModuleNameForImport(filePath, execEnv);

                            if (moduleName.moduleName) {
                                this._setMap(
                                    execEnv,
                                    stripFileExtension(fileEntry.name),
                                    moduleName.moduleName,
                                    filePath
                                );
                            }
                            continue;
                        }
                    }

                    if (fileEntry.isDirectory() && !isPrivateOrProtectedName(stripFileExtension(fileEntry.name))) {
                        this._scan(roots, execEnv, combinePaths(root, fileEntry.name), token);
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
                    this._setMap(execEnv, getFileName(path), moduleName.moduleName, filePath);
                    continue;
                }

                // Stub file or a python file under a directory that has the init file.
                if (
                    getFileExtension(current.name) === '.pyi' ||
                    (containsInit && getFileExtension(current.name) === '.py')
                ) {
                    this._setMap(execEnv, stripFileExtension(current.name), moduleName.moduleName, filePath);
                    continue;
                }
            }

            if (current.isDirectory() && !isPrivateOrProtectedName(stripFileExtension(current.name))) {
                this._scan(roots, execEnv, combinePaths(path, current.name), token);
            }
        }
    }

    private _setMap(execEnv: ExecutionEnvironment, name: string, fullModuleName: string, filePath: string) {
        const moduleNameMap = this._get(execEnv, name);

        const existingPath = moduleNameMap.get(fullModuleName);
        if (!existingPath) {
            const stdLib = this._isStdLib(execEnv, filePath);
            const isStub = getFileExtension(filePath) === '.pyi';
            moduleNameMap.set(fullModuleName, { stdLib, isStub, filePath, shadowed: false });
            return;
        }

        if (existingPath.isStub) {
            existingPath.shadowed = true;
            return;
        }

        existingPath.filePath = filePath;
        existingPath.isStub = true;
        existingPath.shadowed = true;
    }

    private _isStdLib(execEnv: ExecutionEnvironment, filePath: string): boolean {
        const stdLibPath = this._importResolver.getTypeshedStdLibPath(execEnv);
        if (!stdLibPath || stdLibPath.indexOf(stdLibFolderName) < 0) {
            return false;
        }

        return filePath.startsWith(stdLibPath) || filePath.toLowerCase().startsWith(stdLibPath.toLowerCase());
    }

    private _get(execEnv: ExecutionEnvironment, name: string): ImportsMap {
        let map = this._indicesPerExecEnv.get(execEnv.root);
        if (!map) {
            map = new Map<ImportName, ImportsMap>();
            this._indicesPerExecEnv.set(execEnv.root, map);
        }

        let set = map.get(name);
        if (!set) {
            set = new Map<FullImportName, PackageInfo>();
            map.set(name, set);
        }

        return set;
    }

    private _getRoots(execEnv: ExecutionEnvironment): string[] {
        return this._importResolver
            .getImportRoots(execEnv, /*useTypeshedVersionedFolders*/ true)
            .filter((r) => r !== execEnv.root);
    }

    private get _fs() {
        return this._importResolver.fileSystem;
    }
}
