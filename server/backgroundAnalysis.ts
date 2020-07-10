/*
 * backgroundAnalysis.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * run analyzer from background thread
 */

import { isMainThread, Worker } from 'worker_threads';

import { createPylanceImportResolver } from './pylanceImportResolver';
import { ImportResolver } from './pyright/server/src/analyzer/importResolver';
import {
    BackgroundAnalysisBase,
    BackgroundAnalysisRunnerBase,
    InitializationData,
} from './pyright/server/src/backgroundAnalysisBase';
import { getCancellationFolderName } from './pyright/server/src/common/cancellationUtils';
import { ConfigOptions } from './pyright/server/src/common/configOptions';
import { ConsoleInterface } from './pyright/server/src/common/console';
import { FileSystem } from './pyright/server/src/common/fileSystem';

// process.mainModule is "doc-only deprecated" in Node v14+.
const mainFilename: string = (process as any).mainModule.filename;

export class BackgroundAnalysis extends BackgroundAnalysisBase {
    constructor(console: ConsoleInterface) {
        super();

        const initialData: InitializationData = {
            rootDirectory: (global as any).__rootDirectory as string,
            cancellationFolderName: getCancellationFolderName(),
        };

        // this will load this same file in BG thread and start listener
        // Use the main module's path, in case we're in a split bundle (where the main bundle is the entrypoint).
        const worker = new Worker(mainFilename, { workerData: initialData });
        this.setup(worker, console);
    }
}

class BackgroundAnalysisRunner extends BackgroundAnalysisRunnerBase {
    constructor() {
        super();
    }

    protected createImportResolver(fs: FileSystem, options: ConfigOptions): ImportResolver {
        return createPylanceImportResolver(fs, options);
    }
}

// this lets the runner start in the worker thread
if (!isMainThread) {
    const runner = new BackgroundAnalysisRunner();
    runner.start();
}
