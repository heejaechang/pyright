/*
 * indexer.ts
 * Copyright (c) Microsoft Corporation.
 *
 * Index given files.
 */

import { deepEqual } from 'assert';
import { AbstractCancellationTokenSource, CancellationToken, SelectionRange, SymbolKind } from 'vscode-languageserver';
import { MessageChannel, parentPort, threadId, Worker, workerData } from 'worker_threads';

import { ImportResolver, ModuleNameAndType } from 'pyright-internal/analyzer/importResolver';
import { Indices, Program } from 'pyright-internal/analyzer/program';
import * as PythonPathUtils from 'pyright-internal/analyzer/pythonPathUtils';
import { InitializationData } from 'pyright-internal/backgroundAnalysisBase';
import { BackgroundThreadBase, createConfigOptionsFrom, LogData } from 'pyright-internal/backgroundThreadBase';
import {
    createBackgroundThreadCancellationTokenSource,
    getCancellationFolderName,
    getCancellationTokenFromId,
    getCancellationTokenId,
    OperationCanceledException,
    throwIfCancellationRequested,
} from 'pyright-internal/common/cancellationUtils';
import { ConfigOptions, ExecutionEnvironment } from 'pyright-internal/common/configOptions';
import { ConsoleInterface, log, LogLevel } from 'pyright-internal/common/console';
import * as debug from 'pyright-internal/common/debug';
import { LogTracker } from 'pyright-internal/common/logTracker';
import { combinePaths, comparePaths, ensureTrailingDirectorySeparator } from 'pyright-internal/common/pathUtils';
import { getPythonVersionStrings, PythonVersion } from 'pyright-internal/common/pythonVersion';
import * as StringUtils from 'pyright-internal/common/stringUtils';
import { IndexResults, IndexSymbolData } from 'pyright-internal/languageService/documentSymbolProvider';

import { deleteElement, getExecutionEnvironments, getOrAdd } from '../common/collectionUtils';
import { mainFilename } from '../common/mainModuleFileName';
import { PackageScanner } from '../packageScanner';
import { createPylanceImportResolver } from '../pylanceImportResolver';

export class Indexer {
    // This will make sure each projectRoot will have only 1 background indexer running at a time.
    private static _workerPerWorkspace = new Map<string, Worker>();
    private static _cancellationSourcePerWorkspace = new Map<string, AbstractCancellationTokenSource>();

    static requestIndexingFromBackgroundThread(
        console: ConsoleInterface,
        configOptions: ConfigOptions,
        indices: Indices
    ) {
        // If previous indexing for this project is not done yet, cancel it now.
        Indexer.cancelIndexingRequest(configOptions);

        // Get cancellation token source for current indexing request.
        const source = createBackgroundThreadCancellationTokenSource();
        Indexer._cancellationSourcePerWorkspace.set(configOptions.projectRoot, source);

        const worker = Indexer._getWorker(console, configOptions);

        const { port1, port2 } = new MessageChannel();
        function disposeSource() {
            source.dispose();
            port2.close();
            port1.close();

            // Cleanup cancellation token map if I am the latest one. otherwise, next call already
            // removed me from the map.
            if (Indexer._cancellationSourcePerWorkspace.get(configOptions.projectRoot) === source) {
                Indexer._cancellationSourcePerWorkspace.delete(configOptions.projectRoot);
            }
        }

        port1.on('message', (msg: IndexResponse) => {
            switch (msg.requestType) {
                case 'done': {
                    disposeSource();

                    throwIfCancellationRequested(source.token);

                    // Remove existing data and add new ones.
                    indices.reset();
                    for (const [execEnv, indicesMap] of msg.data) {
                        for (const [path, indexResults] of indicesMap) {
                            indices.setIndex(execEnv, path, indexResults);
                        }
                    }
                    break;
                }
                case 'cancelled':
                case 'failed': {
                    disposeSource();
                    break;
                }
                default:
                    debug.fail(`${msg.requestType} is not expected`);
            }
        });

        const cancellationId = getCancellationTokenId(source.token);
        worker.postMessage({ requestType: 'index', data: { configOptions, cancellationId, port: port2 } }, [port2]);
    }

    static cancelIndexingRequest(configOptions: ConfigOptions) {
        // If previous indexing for this project is not done yet, cancel it now.
        const previousSource = Indexer._cancellationSourcePerWorkspace.get(configOptions.projectRoot);
        previousSource?.cancel();
    }

    static indexLibraries(
        importResolver: ImportResolver,
        configOptions: ConfigOptions,
        console: ConsoleInterface,
        logPrefix: string,
        excludes: string[],
        token: CancellationToken
    ) {
        const logTracker = new LogTracker(console, logPrefix);

        return logTracker.log(`index libraries ${configOptions.projectRoot}`, (ll) => {
            // Perf optimization. check if we can use bundled pre-built stdlib indices.
            const stdLibIndices = logTracker.log(`read stdlib indices`, (_) => {
                return Indexer.getStdLibIndices(importResolver, configOptions, console);
            });

            const moduleFilesMap = logTracker.log(`scan packages`, (ls) => {
                // If we can use bundled stdlib indices, skip scanning those files.
                const scanner = new PackageScanner(
                    configOptions,
                    importResolver,
                    stdLibIndices,
                    true,
                    1,
                    new Map<string, number>([['sklearn', 2]])
                );
                scanner.scan(token);
                const map = scanner.getModuleFilesPerExecEnv();
                ls.add(`found ${getModuleCount(map)} modules over ${map.size} exec env`);
                return map;
            });

            // Currently, pyright parses and binds files based on the location of the file being parsed and bound rather than
            // based on an execution environment where original file belong to for imported files. Due to that, regardless of
            // what execution environment the original files belong to, imported files will be parsed and bound to same execution
            // environment. so we can just cache index results as they are since they will be always same.
            const cache = new Map<string, IndexResults>();

            const result = new Map<string, Map<string, IndexResults>>();
            const program = new Program(importResolver, configOptions, console, undefined, logTracker);
            for (const [execEnvRoot, filePaths] of moduleFilesMap) {
                logTracker.log(`index execution environment ${execEnvRoot}`, (ls) => {
                    const execEnv = getExecutionEnvironments(configOptions).find((e) => e.root === execEnvRoot)!;

                    const filteredFiles =
                        excludes.length <= 0
                            ? filePaths
                            : filePaths.filter((f) => !excludes.some((e) => f.startsWith(e)));

                    const map = new Map<string, IndexResults>();
                    for (const filePath of filteredFiles) {
                        const results = cache.get(filePath);
                        if (results) {
                            map.set(filePath, results);
                        }
                    }

                    const newFilePaths = filteredFiles.filter((f) => !map.get(f));
                    program.addTrackedFiles(newFilePaths);
                    Indexer._IndexProgram(program, filteredFiles, map, token);

                    removeDuplicates(importResolver, execEnv, map);

                    for (const filePath of newFilePaths) {
                        const results = map.get(filePath);
                        if (results) {
                            cache.set(filePath, results);
                        }
                    }

                    const stdLib = stdLibIndices?.get(execEnvRoot);
                    if (stdLib) {
                        // Merge prebuilt stdlib indices if we have one.
                        for (const [file, results] of stdLib) {
                            map.set(file, results);
                        }
                    }

                    ls.add(`found ${getSymbolCount(map)} in ${map.size} files`);
                    result.set(execEnvRoot, map);
                });
            }

            ll.add(`found ${getTotalSymbolCount(result)} in ${moduleFilesMap.size} exec envs`);
            return result;
        });

        function getModuleCount<T>(map: Map<string, T[]>) {
            let count = 0;
            for (const modules of map.values()) {
                count += modules.length;
            }

            return count;
        }

        function getTotalSymbolCount(map: Map<string, Map<string, IndexResults>>) {
            let count = 0;
            for (const indices of map.values()) {
                count += getSymbolCount(indices);
            }

            return count;
        }

        function getSymbolCount(map: Map<string, IndexResults>) {
            let count = 0;
            for (const results of map.values()) {
                count += results.symbols.length;
            }

            return count;
        }
    }

    static getStdLibIndices(
        importResolver: ImportResolver,
        configOptions: ConfigOptions,
        console: ConsoleInterface
    ): Map<string, Map<string, IndexResults>> | undefined {
        const typeshedFallback = PythonPathUtils.getTypeShedFallbackPath(importResolver.fileSystem);
        if (!typeshedFallback) {
            return undefined;
        }

        const stdLibFallback = PythonPathUtils.getTypeshedSubdirectory(typeshedFallback, true);

        const mapByEnv = new Map<string, Map<string, IndexResults>>();
        const cachePerVersion = new Map<PythonVersion, Map<string, IndexResults>>();

        let original: Map<string, IndexResults> | undefined;
        for (const execEnv of getExecutionEnvironments(configOptions)) {
            const stdLibPath = importResolver.getTypeshedStdLibPath(execEnv);
            if (stdLibPath !== stdLibFallback) {
                // Use persisted stdlib indices only if it is coming from typeshed fallbacks.
                continue;
            }

            if (!original) {
                const jsonFile = combinePaths(
                    importResolver.fileSystem.getModulePath(),
                    'bundled-indices',
                    'stdlib.json'
                );

                original = readStdLibIndices(importResolver, stdLibFallback, console, jsonFile);
                if (!original) {
                    return undefined;
                }
            }

            const stdLibIndices = getOrAdd(cachePerVersion, execEnv.pythonVersion, () => {
                const versionStrings = getPythonVersionStrings(execEnv.pythonVersion).map((v) =>
                    ensureTrailingDirectorySeparator(combinePaths(stdLibPath, v))
                );

                // Filter out stdlib that doesn't belong to our python version.
                const map = new Map<string, IndexResults>();
                for (const [file, results] of original!) {
                    if (versionStrings.some((v) => file.startsWith(v))) {
                        map.set(file, results);
                    }
                }

                return map;
            });

            mapByEnv.set(execEnv.root, stdLibIndices);
        }

        return mapByEnv;
    }

    static generateStdLibIndices(importResolver: ImportResolver, console: ConsoleInterface, jsonFile: string) {
        const logTracker = new LogTracker(console, 'StdLib');
        const configOptions = new ConfigOptions('.');

        // For prebuilt indexes, don't do static expression evaluation when building symbol table.
        configOptions.defaultPythonVersion = undefined;
        configOptions.defaultPythonPlatform = undefined;

        const indices = logTracker.log(`index stdlib ${configOptions.projectRoot}`, (ll) => {
            const stdLibFiles = logTracker.log(`scan stdlib packages`, (ls) => {
                const scanner = new PackageScanner(configOptions, importResolver, undefined, false, 1);
                scanner.scan(CancellationToken.None);

                const files = scanner.getModuleFilesPerExecEnv().get(configOptions.projectRoot)!;
                ls.add(`found ${files.length}`);
                return files;
            });

            const program = new Program(importResolver, configOptions, console, undefined, logTracker);
            program.setTrackedFiles(stdLibFiles);

            const stdLibIndices = new Map<string, IndexResults>();
            Indexer._IndexProgram(program, stdLibFiles, stdLibIndices, CancellationToken.None);
            removeDuplicates(importResolver, getExecutionEnvironments(configOptions)[0], stdLibIndices);

            ll.add(`found ${[...stdLibIndices.values()].reduce((p, e) => p + e.symbols.length, 0)}`);

            return writeStdLibIndices(importResolver, configOptions, console, jsonFile, stdLibIndices)
                ? stdLibIndices
                : undefined;
        });

        if (!indices) {
            return false;
        }

        // Verify indices written.
        logTracker.log('verify stdlib indices', (_) => {
            const stdLibPath = importResolver.getTypeshedStdLibPath(getExecutionEnvironments(configOptions)[0]);
            const stdLibMap = readStdLibIndices(importResolver, stdLibPath!, console, jsonFile);
            debug.assert(indices.size === stdLibMap!.size);

            for (const filePath of indices.keys()) {
                const original = indices.get(filePath);
                const deserialized = stdLibMap!.get(filePath);

                deepEqual(original, deserialized);
            }
        });

        return true;
    }

    private static _getWorker(console: ConsoleInterface, configOptions: ConfigOptions): Worker {
        let worker = Indexer._workerPerWorkspace.get(configOptions.projectRoot);
        if (worker !== undefined) {
            return worker;
        }

        const initialData: InitializationData = {
            rootDirectory: (global as any).__rootDirectory as string,
            cancellationFolderName: getCancellationFolderName(),
            runner: 'indexer',
        };

        // This will load this same file in BG thread and start listener
        // Use the main module's path, in case we're in a split bundle (where the main bundle is the entry point).
        worker = new Worker(mainFilename, { workerData: initialData });

        // global channel to communicate from BG channel to main thread.
        worker.on('message', (msg: IndexResponse) => {
            switch (msg.requestType) {
                case 'log': {
                    const logData = msg.data as LogData;
                    log(console, logData.level, logData.message);
                    break;
                }
                default:
                    debug.fail(`${msg.requestType} is not expected`);
            }
        });

        // this will catch any exception thrown from background thread,
        // print log and ignore exception
        worker.on('error', (msg) => {
            console.error(`Error occurred on indexer thread: ${JSON.stringify(msg)}`);
        });

        worker.on('exit', (c) => {
            if (c !== 0) {
                debug.fail(`worker stopped with exit code ${c}`);
            }
            Indexer._workerPerWorkspace.delete(configOptions.projectRoot);
        });

        Indexer._workerPerWorkspace.set(configOptions.projectRoot, worker);
        return worker;
    }

    private static _IndexProgram(
        program: Program,
        filePaths: string[],
        map: Map<string, IndexResults>,
        token: CancellationToken
    ) {
        for (const filePath of filePaths) {
            const results = program.getFileIndex(filePath, { indexingForAutoImportMode: true }, token);

            if (!results) {
                continue;
            }

            if (results.symbols.length > 0) {
                map.set(filePath, results);
            }
        }
    }
}

export class BackgroundIndexRunner extends BackgroundThreadBase {
    constructor() {
        super(workerData as InitializationData);

        const data = workerData as InitializationData;
        this.log(LogLevel.Info, `Indexer background runner(${threadId}) root directory: ${data.rootDirectory}`);
    }

    start() {
        this.log(LogLevel.Info, `Indexing(${threadId}) started`);

        // Get requests from main thread.
        parentPort?.on('message', (msg: IndexRequest) => {
            switch (msg.requestType) {
                case 'index': {
                    const port = msg.data.port;
                    try {
                        const token = getCancellationTokenFromId(msg.data.cancellationId);
                        throwIfCancellationRequested(token);

                        const configOptions = createConfigOptionsFrom(msg.data.configOptions);
                        const importResolver = createPylanceImportResolver(this.fs, configOptions);
                        const map = Indexer.indexLibraries(
                            importResolver,
                            configOptions,
                            this.getConsole(),
                            `IDX(${threadId})`,
                            [],
                            token
                        );

                        let count = 0;
                        map.forEach((value) => (count += value.size));
                        this.log(LogLevel.Info, `Indexer done(${threadId}). indexed ${count} files`);
                        port.postMessage({ requestType: 'done', data: [...map] });
                        parentPort?.close();
                    } catch (e) {
                        if (OperationCanceledException.is(e)) {
                            this.log(LogLevel.Log, `Indexer cancelled(${threadId})`);
                            port.postMessage({ requestType: 'cancelled' });
                            return;
                        }

                        this.log(LogLevel.Error, `Indexing Failed: ${debug.getErrorString(e)}`);
                        port.postMessage({ requestType: 'failed' });
                        parentPort?.close();
                    }
                    break;
                }
                default: {
                    debug.fail(`${msg.requestType} is not expected`);
                }
            }
        });
    }
}

interface IndexRequest {
    requestType: 'index';
    data: any;
}

interface IndexResponse {
    requestType: 'log' | 'done' | 'cancelled' | 'failed';
    data: any;
}

function readStdLibIndices(
    importResolver: ImportResolver,
    stdLibPath: string,
    console: ConsoleInterface,
    jsonFile: string
) {
    if (!importResolver.fileSystem.existsSync(jsonFile)) {
        console.info(`No stdlib indices found at ${jsonFile}`);
        return undefined;
    }

    let jsonString: string | undefined;
    try {
        jsonString = importResolver.fileSystem.readFileSync(jsonFile, 'utf8');

        const json: IndicesType[] = JSON.parse(jsonString);
        const map = new Map<string, IndexResults>();

        json.forEach((indices) => {
            map.set(combinePaths(stdLibPath, indices[0]), {
                privateOrProtected: indices[1][0],
                symbols: indices[1][1].map((d) => convert(d)),
            });
        });
        return map;
    } catch (e) {
        console.error(`Failed to read ${jsonFile}. ${debug.getErrorString(e)}`);
        return undefined;
    }

    function convert(data: DataType): IndexSymbolData {
        const alias: AliasType | undefined = data[3];

        return {
            name: data[0],
            externallyVisible: data[1],
            kind: data[2],
            alias: alias
                ? { originalName: alias[0], modulePath: combinePaths(stdLibPath!, alias[1]), kind: alias[2] }
                : undefined,
            range: undefined,
            selectionRange: undefined,
            children: undefined,
        };
    }
}

function writeStdLibIndices(
    importResolver: ImportResolver,
    configOptions: ConfigOptions,
    console: ConsoleInterface,
    jsonFile: string,
    map: Map<string, IndexResults>
) {
    const stdLibPath = importResolver.getTypeshedStdLibPath(getExecutionEnvironments(configOptions)[0])?.toLowerCase();
    if (!stdLibPath) {
        console.error(`No stdlib path for ${configOptions.projectRoot}`);
        return false;
    }

    const prefixLength = ensureTrailingDirectorySeparator(stdLibPath).length;
    const indices: IndicesType[] = [];

    // Write indexes in a stable order so that we can see diff when it gets changed.
    for (const filePath of [...map.keys()].sort()) {
        const results = map.get(filePath)!;
        const symbols = results.symbols as IndexSymbolData[];

        indices.push([filePath.substring(prefixLength), [results.privateOrProtected, symbols.map((d) => convert(d))]]);
    }

    // We can give indentation option to stringify to make json file more git friendly.
    // But for now, file is small enough (200KB) to ignore such optimization yet.
    const content = JSON.stringify(indices);

    try {
        importResolver.fileSystem.writeFileSync(jsonFile, content, 'utf8');
        return true;
    } catch (e) {
        console.error(`Failed to create ${jsonFile}. ${debug.getErrorString(e)}`);
        return false;
    }

    function convert(data: IndexSymbolData): DataType {
        const alias = data.alias;
        debug.assert(!alias || alias.modulePath.toLowerCase().startsWith(stdLibPath!));

        return [
            data.name,
            data.externallyVisible,
            data.kind,
            alias ? [alias.originalName, alias.modulePath.substring(prefixLength), alias.kind] : undefined,
        ];
    }
}

function removeDuplicates(
    importResolver: ImportResolver,
    execEnv: ExecutionEnvironment,
    map: Map<string, IndexResults>
) {
    // [filepath, name] points to 1 unique decl.
    const currentBestMap = new Map<string, Map<string, [ModuleNameAndType, string, boolean, IndexSymbolData]>>();

    // map contains symbols to delete per a file.
    const symbolsToDeleteMap = new Map<string, IndexSymbolData[]>();

    // Go through each entries and collects all duplicate symbols to delete.
    for (const [aliasFile, results] of map) {
        for (const aliasSymbol of results.symbols) {
            if (!aliasSymbol.alias) {
                continue;
            }

            // For the alias, see whether what we have is the best one
            const declFilePath = aliasSymbol.alias.modulePath;
            const declSymbolName = aliasSymbol.alias.originalName;

            const aliasModuleInfo = importResolver.getModuleNameForImport(aliasFile, execEnv);
            const currentBestNameMap = getOrAdd(
                currentBestMap,
                declFilePath,
                () => new Map<string, [ModuleNameAndType, string, boolean, IndexSymbolData]>()
            );

            // No existing best name
            const currentBest = currentBestNameMap.get(declSymbolName);
            if (!currentBest) {
                // Compare alias to actual decl
                const declarationIndexResults = map.get(declFilePath);
                if (!declarationIndexResults) {
                    // This can happen if actual decl is defined in private file.
                    currentBestNameMap.set(declSymbolName, [aliasModuleInfo, aliasFile, false, aliasSymbol]);
                    continue;
                }

                const symbols = declarationIndexResults.symbols as IndexSymbolData[];
                const declSymbol = symbols.find((s) => s.name === declSymbolName);
                if (!declSymbol) {
                    // This can happen if resolve alias is failed for whatever reasons.
                    // Just remove this broken alias.
                    getOrAdd(symbolsToDeleteMap, aliasFile, () => []).push(aliasSymbol);
                    continue;
                }

                // Found decl symbol. compare it and keep only best one.
                const declModuleInfo = importResolver.getModuleNameForImport(declFilePath, execEnv);
                if (compare(aliasModuleInfo, aliasFile, false, declModuleInfo, declFilePath, true) < 0) {
                    currentBestNameMap.set(declSymbolName, [aliasModuleInfo, aliasFile, false, aliasSymbol]);
                    getOrAdd(symbolsToDeleteMap, declFilePath, () => []).push(declSymbol);
                } else {
                    currentBestNameMap.set(declSymbolName, [declModuleInfo, declFilePath, true, declSymbol]);
                    getOrAdd(symbolsToDeleteMap, aliasFile, () => []).push(aliasSymbol);
                }
            } else {
                if (compare(aliasModuleInfo, aliasFile, false, currentBest[0], currentBest[1], currentBest[2]) < 0) {
                    currentBestNameMap.set(declSymbolName, [aliasModuleInfo, aliasFile, false, aliasSymbol]);
                    getOrAdd(symbolsToDeleteMap, currentBest[1], () => []).push(currentBest[3]);
                } else {
                    getOrAdd(symbolsToDeleteMap, aliasFile, () => []).push(aliasSymbol);
                }
            }
        }
    }

    // Delete duplicates
    for (const [file, symbolToDelete] of symbolsToDeleteMap) {
        for (const symbol of symbolToDelete) {
            deleteElement(map.get(file)!.symbols, symbol);
        }
    }

    function compare(
        left: ModuleNameAndType,
        leftFile: string,
        leftDecl: boolean,
        right: ModuleNameAndType,
        rightFile: string,
        rightDecl: boolean
    ) {
        const leftCount = StringUtils.getCharacterCount(left.moduleName, '.');
        const rightCount = StringUtils.getCharacterCount(right.moduleName, '.');
        if (leftCount === rightCount) {
            if (leftDecl === rightDecl) {
                // Prefer decl if dot count is same.
                return comparePaths(leftFile, rightFile, true);
            }

            return leftDecl ? -1 : 1;
        }

        return leftCount - rightCount;
    }
}

// Use tuple to reduce size of serialized indexes.
type AliasType = [string, string, SymbolKind];
type DataType = [string, boolean, SymbolKind, AliasType | undefined];
type ResultsType = [boolean, DataType[]];
type IndicesType = [string, ResultsType];
