/*
 * backgroundAnalysis.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * run analyzer from background thread
 */

import { CancellationToken } from 'vscode-languageserver';
import { isMainThread, MessagePort, Worker, workerData } from 'worker_threads';

import { createPylanceImportResolver } from './pylanceImportResolver';
import { ImportResolver } from './pyright/server/src/analyzer/importResolver';
import { Indices } from './pyright/server/src/analyzer/program';
import {
    BackgroundAnalysisBase,
    BackgroundAnalysisRunnerBase,
    InitializationData,
} from './pyright/server/src/backgroundAnalysisBase';
import { getCancellationFolderName, OperationCanceledException } from './pyright/server/src/common/cancellationUtils';
import { ConfigOptions } from './pyright/server/src/common/configOptions';
import { ConsoleInterface, LogLevel } from './pyright/server/src/common/console';
import { FileSystem } from './pyright/server/src/common/fileSystem';
import { mainFilename } from './src/common/mainModuleFileName';
import { BackgroundIndexRunner, Indexer } from './src/services/indexer';

export class BackgroundAnalysis extends BackgroundAnalysisBase {
    constructor(console: ConsoleInterface) {
        super(console);

        const initialData: InitializationData = {
            rootDirectory: (global as any).__rootDirectory as string,
            cancellationFolderName: getCancellationFolderName(),
        };

        // this will load this same file in BG thread and start listener
        // Use the main module's path, in case we're in a split bundle (where the main bundle is the entry point).
        const worker = new Worker(mainFilename, { workerData: initialData });
        this.setup(worker);
    }

    startIndexing(configOptions: ConfigOptions, indices: Indices) {
        Indexer.requestIndexingFromBackgroundThread(this.console, configOptions, indices);
    }

    refreshIndexing(configOptions: ConfigOptions, indices?: Indices) {
        if (!indices) {
            return;
        }

        Indexer.requestIndexingFromBackgroundThread(this.console, configOptions, indices);
    }

    cancelIndexing(configOptions: ConfigOptions) {
        Indexer.cancelIndexingRequest(configOptions);
    }
}

class BackgroundAnalysisRunner extends BackgroundAnalysisRunnerBase {
    constructor() {
        super();
    }

    protected createImportResolver(fs: FileSystem, options: ConfigOptions): ImportResolver {
        return createPylanceImportResolver(fs, options);
    }

    protected processIndexing(port: MessagePort, token: CancellationToken) {
        try {
            this.program.indexWorkspace((p, r) => {
                this.log(LogLevel.Log, `Indexing Done: ${p}`);
                this.reportIndex(port, { path: p, indexResults: r });
            }, token);
        } catch (e) {
            if (OperationCanceledException.is(e)) {
                return;
            }

            this.log(LogLevel.Error, e.message);
        }
    }
}

// this lets the runner start in the worker thread
if (!isMainThread) {
    const data = workerData as InitializationData;
    if (!data.runner) {
        // run default background runner
        const runner = new BackgroundAnalysisRunner();
        runner.start();
    }

    if (data.runner === 'indexer') {
        const runner = new BackgroundIndexRunner();
        runner.start();
    }
}
