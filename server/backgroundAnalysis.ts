/*
 * backgroundAnalysis.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * run analyzer from background thread
 */

import { isMainThread, Worker } from 'worker_threads';

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
import { createPyrxImportResolver } from './pyrxImportResolver';

export class BackgroundAnalysis extends BackgroundAnalysisBase {
    constructor(console: ConsoleInterface) {
        super();

        const initialData: InitializationData = {
            rootDirectory: (global as any).__rootDirectory as string,
            cancellationFolderName: getCancellationFolderName(),
        };

        // this will load this same file in BG thread and start listener
        const worker = new Worker(__filename, { workerData: initialData });
        this.setup(worker, console);
    }
}

class BackgroundAnalysisRunner extends BackgroundAnalysisRunnerBase {
    constructor() {
        super();
    }

    protected createImportResolver(fs: FileSystem, options: ConfigOptions): ImportResolver {
        return createPyrxImportResolver(fs, options);
    }
}

// this lets the runner start in the worker thread
if (!isMainThread) {
    const runner = new BackgroundAnalysisRunner();
    runner.start();
}
