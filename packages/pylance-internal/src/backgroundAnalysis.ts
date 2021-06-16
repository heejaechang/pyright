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
import { Indices, MaxWorkspaceIndexFileCount } from 'pyright-internal/analyzer/program';
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
import { isString } from 'pyright-internal/common/core';
import { FileSystem } from 'pyright-internal/common/fileSystem';
import { Range } from 'pyright-internal/common/textRange';
import { Duration } from 'pyright-internal/common/timing';

import { mainFilename } from './common/mainModuleFileName';
import {
    TelemetryEvent,
    TelemetryEventInterface,
    TelemetryEventName,
    TelemetryInterface,
    TelemetryWaitTimeSeconds,
    trackPerf,
} from './common/telemetry';
import { getSemanticTokens } from './languageService/semanticTokenProvider';
import { createPylanceImportResolver, PylanceImportResolver } from './pylanceImportResolver';
import { BackgroundIndexRunner, Indexer } from './services/indexer';

export interface ExperimentOptions {
    useImportHeuristic: boolean;
}

export class BackgroundAnalysis extends BackgroundAnalysisBase {
    constructor(private _telemetry: TelemetryInterface, console: ConsoleInterface) {
        super(console);

        const initialData: InitializationData = {
            rootDirectory: (global as any).__rootDirectory as string,
            cancellationFolderName: getCancellationFolderName(),
            runner: undefined,
        };

        // this will load this same file in BG thread and start listener
        // Use the main module's path, in case we're in a split bundle (where the main bundle is the entry point).
        const worker = new Worker(mainFilename, { workerData: initialData });
        this.setup(worker);
    }

    protected override onMessage(msg: AnalysisResponse) {
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

    override startIndexing(configOptions: ConfigOptions, indices: Indices) {
        Indexer.requestIndexingFromBackgroundThread(this._telemetry, this.console, configOptions, indices);
    }

    override refreshIndexing(configOptions: ConfigOptions, indices?: Indices) {
        if (!indices) {
            return;
        }

        Indexer.requestIndexingFromBackgroundThread(this._telemetry, this.console, configOptions, indices);
    }

    override cancelIndexing(configOptions: ConfigOptions) {
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

    async setExperimentOptions(flags: ExperimentOptions) {
        const { port1, port2 } = new MessageChannel();
        const waiter = getBackgroundWaiter<void>(port1);

        this.enqueueRequest({
            requestType: 'setExperimentOptions',
            data: flags,
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

interface StartupTelemetry {
    preSetFileOpenMs: number; // time between BackgroundAnalysisRunner and file open
    tokenRangeMs: number; // semantic token range
    tokenFullMs: number; // semantic token full
    tokenDeltaMs: number; // semantic token delta
    analysisMs: number;
    userIndexMs: number; // user file indexing
    totalMs: number;
    peakRssMB: number;
}

class BackgroundAnalysisRunner extends BackgroundAnalysisRunnerBase {
    private readonly _telemetry: TelemetryInterface;
    private readonly _telemetryDuration = new Duration();

    private _lastTelemetryReported = -Infinity;
    private _resolverId = 0;
    private _startupTelemetry: StartupTelemetry;
    private _analysisDuration?: Duration;
    private _startupDuration?: Duration;
    private _hasOpenedFile = false;

    constructor() {
        super();
        this._startupDuration = new Duration();
        this._startupTelemetry = this.initialStartupTelemetry();
        this._telemetry = {
            sendTelemetry(event: TelemetryEventInterface) {
                parentPort?.postMessage({ requestType: 'telemetry', data: event });
            },
        };
    }

    protected override onMessage(msg: AnalysisRequest) {
        switch (msg.requestType) {
            case 'getSemanticTokens': {
                const { filePath, range, previousResultId, cancellationId } = msg.data;
                const subtype = range !== undefined ? 'range' : isString(previousResultId) ? 'delta' : 'full';
                this.log(LogLevel.Log, `Background analysis message: ${msg.requestType} ${subtype}`);

                run(() => {
                    const token = getCancellationTokenFromId(cancellationId);
                    throwIfCancellationRequested(token);

                    const tokenDuration = new Duration();
                    const tokens = trackPerf(
                        this._telemetry,
                        TelemetryEventName.SEMANTICTOKENS_SLOW,
                        (cm) => {
                            const info = _getSemanticInfoAsString(subtype, range, previousResultId);
                            const tokens = this._logTracker.log(`getSemanticTokens ${info} at ${filePath}`, (ls) => {
                                return getSemanticTokens(this.program, filePath, range, previousResultId, token);
                            });

                            cm.addCustomMeasure('count', tokens.data.length);
                            return tokens;
                        },
                        SEMANTICTOKENS_THRESHOLD_MS
                    );

                    if (subtype === 'range') {
                        this._startupTelemetry.tokenRangeMs += tokenDuration.getDurationInMilliseconds();
                    } else if (subtype === 'full') {
                        this._startupTelemetry.tokenFullMs += tokenDuration.getDurationInMilliseconds();
                    } else if (subtype === 'delta') {
                        this._startupTelemetry.tokenDeltaMs += tokenDuration.getDurationInMilliseconds();
                    }

                    return tokens;
                }, msg.port!);
                break;
            }

            case 'setExperimentOptions': {
                const flags = msg.data;
                (this._importResolver as PylanceImportResolver).useImportHeuristic(flags.useImportHeuristic);
                break;
            }

            case 'setFileOpened': {
                if (!this._hasOpenedFile) {
                    if (this._startupDuration && this._startupTelemetry.preSetFileOpenMs === 0) {
                        this._startupTelemetry.preSetFileOpenMs = this._startupDuration?.getDurationInMilliseconds();
                    }
                    // reset the duration to start analysis timing from the first file opened
                    this._startupDuration = new Duration();
                    this._hasOpenedFile = true;
                }

                super.onMessage(msg);
                break;
            }

            case 'restart': {
                this.resetStartupTelemetry();
                super.onMessage(msg);
                break;
            }

            case 'analyze': {
                this._analysisDuration = this._analysisDuration ?? new Duration();
                super.onMessage(msg);
                break;
            }

            case 'setConfigOptions': {
                this.resetStartupTelemetry();
                super.onMessage(msg);
                break;
            }

            default: {
                super.onMessage(msg);
            }
        }

        // track peak memory usage
        const usage = process.memoryUsage();
        this._startupTelemetry.peakRssMB = Math.max(usage.rss, this._startupTelemetry.peakRssMB);
    }

    protected override analysisDone(port: MessagePort, cancellationId: string) {
        super.analysisDone(port, cancellationId);

        const current = this._telemetryDuration.getDurationInSeconds();
        if (current - this._lastTelemetryReported > TelemetryWaitTimeSeconds) {
            (this._importResolver as PylanceImportResolver).sendTelemetry();
            this._lastTelemetryReported = current;
        }

        if (this._startupDuration && this._analysisDuration) {
            this._startupTelemetry.totalMs = this._startupDuration.getDurationInMilliseconds();

            // user code indexing happens just before this function analysisDone() is called, so we need to subtract it.
            this._startupTelemetry.analysisMs =
                this._analysisDuration.getDurationInMilliseconds() - this._startupTelemetry.userIndexMs;

            const event = new TelemetryEvent(TelemetryEventName.STARTUP_METRICS);
            event.Measurements['tokenRangeMs'] = this._startupTelemetry.tokenRangeMs;
            event.Measurements['tokenFullMs'] = this._startupTelemetry.tokenFullMs;
            event.Measurements['tokenDeltaMs'] = this._startupTelemetry.tokenDeltaMs;
            event.Measurements['analysisMs'] = this._startupTelemetry.analysisMs;
            event.Measurements['userIndexMs'] = this._startupTelemetry.userIndexMs;
            event.Measurements['totalMs'] = this._startupTelemetry.totalMs;
            event.Measurements['peakRssMB'] = this._startupTelemetry.peakRssMB / 1024 / 1024;
            event.Measurements['preSetFileOpenMs'] = this._startupTelemetry.preSetFileOpenMs;

            this._telemetry.sendTelemetry(event);
            this._startupDuration = undefined;
            this._analysisDuration = undefined;
            this._startupTelemetry = this.initialStartupTelemetry();
        }
    }

    private resetStartupTelemetry() {
        this._startupDuration = new Duration();
        this._analysisDuration = undefined;
        this._hasOpenedFile = false;
        this._startupTelemetry = this.initialStartupTelemetry();
    }

    private initialStartupTelemetry() {
        return {
            preSetFileOpenMs: 0,
            tokenRangeMs: 0,
            tokenFullMs: 0,
            tokenDeltaMs: 0,
            analysisMs: 0,
            userIndexMs: 0,
            totalMs: 0,
            peakRssMB: 0,
        };
    }

    protected override createImportResolver(fs: FileSystem, options: ConfigOptions): ImportResolver {
        return createPylanceImportResolver(fs, options, this._resolverId++, this.getConsole(), this._telemetry);
    }

    protected override processIndexing(port: MessagePort, token: CancellationToken) {
        try {
            const indexDuration = new Duration();
            trackPerf(
                this._telemetry,
                TelemetryEventName.WORKSPACEINDEX_SLOW,
                (cm) => {
                    const count = this.program.indexWorkspace((p, r) => {
                        this.log(LogLevel.Log, `Indexing Done: ${p}`);
                        this.reportIndex(port, { path: p, indexResults: r });
                    }, token);

                    if (count > MaxWorkspaceIndexFileCount) {
                        const te = new TelemetryEvent(TelemetryEventName.WORKSPACEINDEX_THRESHOLD_REACHED);
                        te.Measurements['index_count'] = count;

                        this._telemetry.sendTelemetry(te);
                    }

                    cm.addCustomMeasure('count', count);
                },
                WORKSPACEINDEX_THRESHOLD_MS
            );

            this._startupTelemetry.userIndexMs = indexDuration.getDurationInMilliseconds();
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

function _getSemanticInfoAsString(
    subtype: string,
    range: Range | undefined,
    previousResultId: string | undefined
): string {
    let details = `${subtype}`;
    if (range) {
        details += ` ${range.start.line}:${range.start.character} - ${range.end.line}:${range.end.character}`;
    }

    if (previousResultId) {
        details += ` previousResultId:${previousResultId}`;
    }

    return details;
}
