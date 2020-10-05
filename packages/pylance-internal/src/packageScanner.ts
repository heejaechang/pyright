/*
 * packageScanner.ts
 *
 * Scan installed packages/modules and Create indices.
 */

import { CancellationToken } from 'vscode-languageserver';

import { ImportResolver } from 'pyright-internal/analyzer/importResolver';
import { isPrivateOrProtectedName } from 'pyright-internal/analyzer/symbolNameUtils';
import { throwIfCancellationRequested } from 'pyright-internal/common/cancellationUtils';
import { ConfigOptions, ExecutionEnvironment } from 'pyright-internal/common/configOptions';
import * as debug from 'pyright-internal/common/debug';
import {
    combinePaths,
    getFileExtension,
    isFileSystemCaseSensitive,
    stripFileExtension,
} from 'pyright-internal/common/pathUtils';
import { equateStringsCaseInsensitive, equateStringsCaseSensitive } from 'pyright-internal/common/stringUtils';

import { getExecutionEnvironments, getOrAdd } from './common/collectionUtils';

interface PackageInfo {
    stdLib: boolean;
    isStub: boolean;
    filePath: string;
    shadowed: boolean;
}

export class PackageScanner<T> {
    private _stringComparer: (a: string, b: string) => boolean;

    private _indicesPerExecEnv = new Map<string, ImportsMap>();
    private _executionEnvironments: ExecutionEnvironment[] = [];
    private _stdLibPaths: Map<string, string | undefined>;

    private _fs: FSCache;

    constructor(
        configOptions: ConfigOptions,
        importResolver: ImportResolver,
        private _stdLibIndices: Map<string, Map<string, T>> | undefined,
        private _includeThirdParty: boolean,
        private _defaultDepthLimit: number,
        private _moduleDepthLimit?: Map<string, number>
    ) {
        this._stringComparer = isFileSystemCaseSensitive(importResolver.fileSystem)
            ? equateStringsCaseSensitive
            : equateStringsCaseInsensitive;

        this._executionEnvironments = getExecutionEnvironments(configOptions);

        this._stdLibPaths = new Map<string, string>();
        for (const execEnv of this._executionEnvironments) {
            this._stdLibPaths.set(execEnv.root, importResolver.getTypeshedStdLibPath(execEnv));
        }

        this._fs = new FSCache(importResolver);
    }

    getModuleFilesPerExecEnv() {
        // Indices is organized by module names. Regroup them
        // by module file path.
        const map = new Map<string, string[]>();
        const set = new Set<string>();
        for (const [execEnvRoot, moduleMap] of this._indicesPerExecEnv) {
            for (const [_, packageInfo] of moduleMap) {
                if (!packageInfo.stdLib && packageInfo.isStub && !packageInfo.shadowed) {
                    // filter out any third party library stubs that doesn't have corresponding
                    // library installed in current execution environment.
                    continue;
                }

                const noStdLib = this._stdLibIndices?.get(execEnvRoot);
                if (noStdLib && packageInfo.stdLib) {
                    continue;
                }

                if (!this._includeThirdParty && !packageInfo.stdLib) {
                    debug.fail(`${packageInfo.filePath} shouldn't be included with no third party flag on`);
                }

                set.add(packageInfo.filePath);
            }

            map.set(execEnvRoot, [...set]);
            set.clear();
        }

        return map;
    }

    scan(token: CancellationToken): void {
        for (const execEnv of this._executionEnvironments) {
            const stdLibPath = this._stdLibPaths.get(execEnv.root);
            const roots = this._fs.getRoots(execEnv);

            const noStdLib = this._stdLibIndices?.get(execEnv.root);
            if (noStdLib) {
                // This will let us skip py files for stdlib.
                this._populateStdLibInfo(execEnv);
            }

            for (const root of roots) {
                const stdLib = stdLibPath ? this._startWith(root, stdLibPath) : false;
                if (noStdLib && stdLib) {
                    continue;
                }

                if (!this._includeThirdParty && !stdLib) {
                    continue;
                }

                for (const current of this._fs.readdirEntriesSync(root)) {
                    throwIfCancellationRequested(token);

                    if (current.isFile) {
                        if (current.isInit) {
                            // root can't have __init__ or py file
                            continue;
                        }

                        // Stub file
                        if (current.isStub) {
                            const moduleName = this._fs.getModuleNameForImport(current.filePath, execEnv);
                            if (moduleName) {
                                this._setMap(execEnv, stdLib, moduleName, current, 1, this._defaultDepthLimit);
                            }
                            continue;
                        }
                    }

                    if (!current.isFile && current.public) {
                        // moduleDepthLimit map contains top level module name and its max depth to dig in. If not defined,
                        // we will use default depth limit
                        const maxDpeth = this._moduleDepthLimit?.get(current.name) ?? this._defaultDepthLimit;
                        this._scan(roots, execEnv, stdLib, current.filePath, 1, maxDpeth, token);
                    }
                }
            }
        }
    }

    private _scan(
        roots: string[],
        execEnv: ExecutionEnvironment,
        stdLib: boolean,
        path: string,
        depth: number,
        maxDepth: number,
        token: CancellationToken
    ) {
        if (roots.some((r) => this._stringComparer(path, r))) {
            // Don't dig in nested roots. We only care about preserving case sensitivity for
            // part of paths (after import roots) which become python symbols referencing
            // modules. otherwise, we follow os/fs's case sensitivity.
            // PEP 235 (https://www.python.org/dev/peps/pep-0235/)
            return;
        }

        const nextDepth = depth + 1;
        for (const current of this._fs.readdirEntriesSync(path)) {
            throwIfCancellationRequested(token);

            if (current.isFile) {
                if (current.isInit) {
                    const moduleName = this._fs.getModuleNameForImport(current.filePath, execEnv);
                    if (moduleName) {
                        this._setMap(execEnv, stdLib, moduleName, current, depth, maxDepth);
                    }
                    continue;
                }

                // Stub file or a python file under a directory that has the init file.
                if (current.isStub || current.containsInit) {
                    const moduleName = this._fs.getModuleNameForImport(current.filePath, execEnv);
                    if (moduleName) {
                        this._setMap(execEnv, stdLib, moduleName, current, nextDepth, maxDepth);
                    }
                    continue;
                }
            }

            if (!current.isFile && current.public && this._include(stdLib, nextDepth, maxDepth)) {
                this._scan(roots, execEnv, stdLib, current.filePath, nextDepth, maxDepth, token);
            }
        }
    }

    private _populateStdLibInfo(execEnv: ExecutionEnvironment) {
        const map = this._stdLibIndices!.get(execEnv.root);
        for (const stdLibFile of map!.keys()) {
            const moduleName = this._fs.getModuleNameForImport(stdLibFile, execEnv);
            if (moduleName) {
                this._setMap(
                    execEnv,
                    true,
                    moduleName,
                    {
                        isStub: getFileExtension(stdLibFile) === 'pyi',
                        filePath: stdLibFile,
                    },
                    1,
                    this._defaultDepthLimit
                );
            }
        }
    }

    private _setMap(
        execEnv: ExecutionEnvironment,
        stdLib: boolean,
        fullModuleName: string,
        entry: { isStub: boolean; filePath: string },
        depth: number,
        maxDepth: number
    ) {
        const moduleNameMap = getOrAdd(
            this._indicesPerExecEnv,
            execEnv.root,
            () => new Map<FullImportName, PackageInfo>()
        );

        const existingPath = moduleNameMap.get(fullModuleName);
        if (!existingPath) {
            if (this._include(stdLib, depth, maxDepth)) {
                moduleNameMap.set(fullModuleName, {
                    stdLib,
                    isStub: entry.isStub,
                    filePath: entry.filePath,
                    shadowed: false,
                });
            }
            return;
        }

        if (existingPath.isStub) {
            existingPath.shadowed = true;
            return;
        }

        existingPath.filePath = entry.filePath;
        existingPath.isStub = true;
        existingPath.shadowed = true;
    }

    private _include(stdLib: boolean, depth: number, maxDepth: number) {
        return stdLib || depth <= maxDepth;
    }

    private _startWith(filePath: string, stdLibPath: string) {
        if (filePath.length < stdLibPath.length) {
            return false;
        }

        return this._stringComparer(filePath.substring(0, stdLibPath.length), stdLibPath);
    }
}

type FullImportName = string;
type Venv = string | undefined;
type ImportsMap = Map<FullImportName, PackageInfo>;

interface Entry {
    readonly name: string;
    readonly filePath: string;
    readonly isFile: boolean;
    readonly isInit: boolean;
    readonly containsInit: boolean;
    readonly isStub: boolean;
    readonly public: boolean;
}

class FSCache {
    private _mapByPath = new Map<string, Entry[]>();
    private _fullImportNameMap = new Map<string, Map<Venv, FullImportName>>();

    constructor(private _importResolver: ImportResolver) {}

    private get _fs() {
        return this._importResolver.fileSystem;
    }

    readdirEntriesSync(path: string) {
        const entries = this._mapByPath.get(path);
        if (entries) {
            return entries;
        }

        const newEntries: Entry[] = [];
        for (const entry of this._fs.readdirEntriesSync(path)) {
            if (entry.isFile()) {
                const extension = getFileExtension(entry.name);
                const isStub = extension === '.pyi';
                const isRegular = extension === '.py';
                if (!isStub && !isRegular) {
                    continue;
                }

                const isInit = entry.name === '__init__.py' || entry.name === '__init__.pyi';
                const containsInit = this._fs.existsSync(combinePaths(path, '__init__.py'));
                const filePath = combinePaths(path, entry.name);

                newEntries.push({
                    name: entry.name,
                    filePath,
                    isFile: true,
                    isInit,
                    containsInit,
                    isStub,
                    public: true,
                });
            } else if (entry.isDirectory()) {
                newEntries.push({
                    name: entry.name,
                    filePath: combinePaths(path, entry.name),
                    isFile: false,
                    isInit: false,
                    containsInit: false,
                    isStub: false,
                    public: !isPrivateOrProtectedName(stripFileExtension(entry.name)),
                });
            }
        }
        this._mapByPath.set(path, newEntries);
        return newEntries;
    }

    getModuleNameForImport(path: string, execEnv: ExecutionEnvironment) {
        return getOrAdd(
            getOrAdd(this._fullImportNameMap, path, () => new Map<Venv, FullImportName>()),
            execEnv.venv,
            () => {
                return this._importResolver.getModuleNameForImport(path, execEnv).moduleName;
            }
        );
    }

    getRoots(execEnv: ExecutionEnvironment): string[] {
        return this._importResolver
            .getImportRoots(execEnv, /*useTypeshedVersionedFolders*/ true)
            .filter((r) => r !== execEnv.root && this.existsSync(r));
    }

    existsSync(path: string) {
        if (this._mapByPath.get(path)) {
            return true;
        }

        return this._fs.existsSync(path);
    }
}
