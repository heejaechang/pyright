/*
 * backgroundAnalysis.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * run analyzer from background thread
 */

import { CancellationToken, SemanticTokens } from 'vscode-languageserver';
import { MessageChannel, MessagePort, parentPort, Worker, workerData } from 'worker_threads';

import { ImportResolver } from 'pyright-internal/analyzer/importResolver';
import { Indices } from 'pyright-internal/analyzer/program';
import {
    AnalysisRequest,
    AnalysisResponse,
    BackgroundAnalysisBase,
    BackgroundAnalysisRunnerBase,
    InitializationData,
} from 'pyright-internal/backgroundAnalysisBase';
import { getBackgroundWaiter, run } from 'pyright-internal/backgroundThreadBase';
import {
    getCancellationFolderName,
    getCancellationTokenFromId,
    getCancellationTokenId,
    OperationCanceledException,
    throwIfCancellationRequested,
} from 'pyright-internal/common/cancellationUtils';
import { ConfigOptions } from 'pyright-internal/common/configOptions';
import { ConsoleInterface, LogLevel } from 'pyright-internal/common/console';
import { FileSystem } from 'pyright-internal/common/fileSystem';
import { Range } from 'pyright-internal/common/textRange';

import { mainFilename } from './common/mainModuleFileName';
import { TelemetryEventInterface, TelemetryEventName, TelemetryInterface, trackPerf } from './common/telemetry';
import { getSemanticTokens } from './languageService/semanticTokenProvider';
import { createPylanceImportResolver } from './pylanceImportResolver';
import { BackgroundIndexRunner, Indexer } from './services/indexer';

export class BackgroundAnalysis extends BackgroundAnalysisBase {
    constructor(private _telemetry: TelemetryInterface, console: ConsoleInterface) {
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

    protected onMessage(msg: AnalysisResponse) {
        switch (msg.requestType) {
            case 'telemetry': {
                this._telemetry.sendTelemetry(msg.data as TelemetryEventInterface);
                break;
            }

            default: {
                super.onMessage(msg);
            }
        }
    }

    startIndexing(configOptions: ConfigOptions, indices: Indices) {
        Indexer.requestIndexingFromBackgroundThread(this._telemetry, this.console, configOptions, indices);
    }

    refreshIndexing(configOptions: ConfigOptions, indices?: Indices) {
        if (!indices) {
            return;
        }

        Indexer.requestIndexingFromBackgroundThread(this._telemetry, this.console, configOptions, indices);
    }

    cancelIndexing(configOptions: ConfigOptions) {
        Indexer.cancelIndexingRequest(configOptions);
    }

    async getSemanticTokens(
        filePath: string,
        range: Range | undefined,
        previousResultId: string | undefined,
        token: CancellationToken
    ): Promise<SemanticTokens> {
        throwIfCancellationRequested(token);

        const { port1, port2 } = new MessageChannel();
        const waiter = getBackgroundWaiter<SemanticTokens>(port1);

        const cancellationId = getCancellationTokenId(token);
        this.enqueueRequest({
            requestType: 'getSemanticTokens',
            data: { filePath, range, previousResultId, cancellationId },
            port: port2,
        });

        const result = await waiter;

        port2.close();
        port1.close();

        return result;
    }
}

const SEMANTICTOKENS_THRESHOLD_MS = 2000;
const WORKSPACEINDEX_THRESHOLD_MS = 10000;

class BackgroundAnalysisRunner extends BackgroundAnalysisRunnerBase {
    private readonly _telemetry: TelemetryInterface;

    constructor() {
        super();

        this._telemetry = {
            sendTelemetry(event: TelemetryEventInterface) {
                parentPort?.postMessage({ requestType: 'telemetry', data: event });
            },
        };
    }

    protected onMessage(msg: AnalysisRequest) {
        switch (msg.requestType) {
            case 'getSemanticTokens': {
                this.log(LogLevel.Log, `Background analysis message: ${msg.requestType}`);

                run(() => {
                    const { filePath, range, previousResultId, cancellationId } = msg.data;
                    const token = getCancellationTokenFromId(cancellationId);
                    throwIfCancellationRequested(token);

                    return trackPerf(
                        this._telemetry,
                        TelemetryEventName.SEMANTICTOKENS_SLOW,
                        (cm) => {
                            const tokens = getSemanticTokens(this.program, filePath, range, previousResultId, token);

                            cm.addCustomMeasure('count', tokens.data.length);
                            return tokens;
                        },
                        SEMANTICTOKENS_THRESHOLD_MS
                    );
                }, msg.port!);
                break;
            }

            default: {
                super.onMessage(msg);
            }
        }
    }

    protected createImportResolver(fs: FileSystem, options: ConfigOptions): ImportResolver {
        return createPylanceImportResolver(fs, options);
    }

    protected processIndexing(port: MessagePort, token: CancellationToken) {
        try {
            trackPerf(
                this._telemetry,
                TelemetryEventName.WORKSPACEINDEX_SLOW,
                (cm) => {
                    const count = this.program.indexWorkspace((p, r) => {
                        this.log(LogLevel.Log, `Indexing Done: ${p}`);
                        this.reportIndex(port, { path: p, indexResults: r });
                    }, token);

                    cm.addCustomMeasure('count', count);
                },
                WORKSPACEINDEX_THRESHOLD_MS
            );
        } catch (e) {
            if (OperationCanceledException.is(e)) {
                return;
            }

            this.log(LogLevel.Error, e.message);
        }
    }
}

export function runBackgroundThread() {
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
