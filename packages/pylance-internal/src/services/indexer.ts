/*
 * indexer.ts
 * Copyright (c) Microsoft Corporation.
 *
 * Index given files.
 */

import { AbstractCancellationTokenSource, CancellationToken } from 'vscode-languageserver';
import { MessageChannel, parentPort, threadId, Worker, workerData } from 'worker_threads';

import { ImportResolver } from 'pyright-internal/analyzer/importResolver';
import { Indices, Program } from 'pyright-internal/analyzer/program';
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
import { ConfigOptions } from 'pyright-internal/common/configOptions';
import { ConsoleInterface, log, LogLevel } from 'pyright-internal/common/console';
import * as debug from 'pyright-internal/common/debug';
import { IndexResults } from 'pyright-internal/languageService/documentSymbolProvider';

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
        const scanner = new PackageScanner(configOptions, importResolver);
        scanner.scan(token);

        const moduleFilesMap = scanner.getModuleFilesPerExecEnv();
        const result = new Map<string, Map<string, IndexResults>>();
        for (const [envExecRoot, moduleFilePaths] of moduleFilesMap) {
            const files =
                excludes.length <= 0
                    ? moduleFilePaths
                    : moduleFilePaths.filter((f) => !excludes.some((e) => f.startsWith(e)));
            const map = Indexer._indexFiles(importResolver, configOptions, console, logPrefix, files, token);
            result.set(envExecRoot, map);
        }

        return result;
    }

    static _getWorker(console: ConsoleInterface, configOptions: ConfigOptions): Worker {
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

    static _indexFiles(
        importResolver: ImportResolver,
        configOptions: ConfigOptions,
        console: ConsoleInterface,
        logPrefix: string,
        files: string[],
        token: CancellationToken
    ): Map<string, IndexResults> {
        const program = new Program(importResolver, configOptions, console, undefined, logPrefix);
        program.setTrackedFiles(files);

        return Indexer._IndexProgram(program, files, token);
    }

    static _IndexProgram(program: Program, files: string[], token: CancellationToken) {
        const map = new Map<string, IndexResults>();

        for (const file of files) {
            const results = program.getFileIndex(file, true, token);
            if (!results) {
                continue;
            }

            if (results.symbols.length > 0) {
                map.set(file, results);
            }
        }

        return map;
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
