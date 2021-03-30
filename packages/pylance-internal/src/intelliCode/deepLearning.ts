/*
 * deepLearning.ts
 *
 * IntelliCode core.
 */

import type { InferenceSession } from 'onnxruntime';
import { CancellationToken } from 'vscode-languageserver';

import { LogLevel } from 'pyright-internal/common/console';
import { ParseResults } from 'pyright-internal/parser/parser';

import { LogService } from '../common/logger';
import { Platform } from '../common/platform';
import { getExceptionMessage, TelemetryEventName, TelemetryService } from '../common/telemetry';
import { ExpressionWalker } from './expressionWalker';
import { EditorInvocation, PythiaModel } from './models';
import { EditorLookBackTokenGenerator } from './tokens/editorTokenGenerator';

const LookbackTokenLength = 100;

export interface DeepLearningResult {
    recommendations: string[];
    invocation: EditorInvocation | undefined;
}

const EmptyResult = { recommendations: [], invocation: undefined };

export class DeepLearning {
    private _onnx?: typeof import('onnxruntime');
    private _session?: InferenceSession;

    constructor(
        private readonly _model: PythiaModel,
        private readonly _platform: Platform,
        private readonly _logger?: LogService,
        private readonly _telemetry?: TelemetryService
    ) {}

    async initialize(): Promise<void> {
        if (!this._platform.isOnnxSupported()) {
            this._logger?.log(LogLevel.Warn, 'IntelliCode is not supported on this platform.');
            return;
        }

        if (!this._onnx) {
            this._logger?.log(LogLevel.Log, 'Loading ONNX runtime...');
            try {
                this._onnx = require('onnxruntime');
                this._logger?.log(LogLevel.Log, 'Loaded ONNX runtime. Creating IntelliCode session...');
            } catch (e) {
                this.logError('Failed to load ONNX runtime', e);
            }
        }

        if (this._onnx) {
            try {
                this._session = await this._onnx.InferenceSession.create(this._model.onnxModelPath, {
                    logSeverityLevel: this.getOnnxLogLevel(),
                });
                this._logger?.log(LogLevel.Log, 'Created IntelliCode session.');
            } catch (e) {
                this.logError('Failed to create IntelliCode session', e);
            }
        }
    }

    async getRecommendations(
        parseResults: ParseResults,
        expressionWalker: ExpressionWalker,
        position: number,
        token: CancellationToken
    ): Promise<DeepLearningResult> {
        if (!this._onnx || !this._session) {
            return EmptyResult; // Unsupported platform
        }

        const tg = new EditorLookBackTokenGenerator();
        const invocation = tg.generateLookbackTokens(parseResults, expressionWalker, position);
        if (!invocation) {
            this._logger?.log(LogLevel.Log, 'IntelliCode: current invocation did not produce any meaningful tokens.');
            return EmptyResult;
        }

        // Run the inference
        const recommendations: string[] = [];
        try {
            const tokenIds = this.convertTokenToId(invocation.lookbackTokens);

            const tensor1 = new this._onnx.Tensor('int32', tokenIds, [1, tokenIds.length]);
            const tensor2 = new this._onnx.Tensor('int32', [LookbackTokenLength], [1]);
            const input = {
                ['input_batch:0']: tensor1,
                ['lengths:0']: tensor2,
            };

            const rt = await this._session.run(input, ['top_k:1']);
            if (token?.isCancellationRequested) {
                return EmptyResult;
            }

            const results = rt['top_k:1'];
            if (results) {
                for (const r of results.data) {
                    const n = r as number;
                    if (n) {
                        recommendations.push(this._model.tokens[n]);
                    }
                }
            }
        } catch (e) {
            this._logger?.log(LogLevel.Error, `IntelliCode exception: ${getExceptionMessage(e)}`);
        }
        return { recommendations, invocation };
    }

    private convertTokenToId(lookbackTokens: string[]): number[] {
        const result = new Array<number>(LookbackTokenLength);
        let i = 0;
        if (lookbackTokens.length < LookbackTokenLength) {
            // Left padding with 0
            for (; i < LookbackTokenLength - lookbackTokens.length; i++) {
                result[i] = 0;
            }
        }

        let unknownTokenId = this._model.tokenIdMap.entries.length;
        const unknownTokenIdMap = new Map<string, number>();

        // Replace out-of-vocabulary tokens with token ids dynamically generated
        // this is by design behavior.
        for (const token of lookbackTokens) {
            let t = this._model.tokenIdMap.get(token);
            if (t) {
                result[i++] = t;
            } else {
                t = unknownTokenIdMap.get(token);
                if (t) {
                    result[i++] = t;
                } else {
                    const nextId = unknownTokenId++;
                    unknownTokenIdMap.set(token, nextId);
                    result[i++] = nextId;
                }
            }
        }
        return result;
    }

    private getOnnxLogLevel(): 0 | 1 | 2 | 3 | 4 {
        // ONNX log severity level. See
        // https://github.com/microsoft/onnxruntime/blob/master/include/onnxruntime/core/common/logging/severity.h
        //
        // enum class Severity {
        //   kVERBOSE = 0,
        //   kINFO = 1,
        //   kWARNING = 2,
        //   kERROR = 3,
        //   kFATAL = 4
        // };
        //
        // Note that ONNX is quite chatty and outputs bunch of stuff even on `WARNING`.
        // Thus we set ONNX level to ERROR in all cases except Trace in order to
        // reduce amount of internal information in the console.
        switch (this._logger?.level) {
            case LogLevel.Error:
            case LogLevel.Warn:
            case LogLevel.Info:
                return 3;
            case LogLevel.Log:
                return 0;
        }
        return 1;
    }

    private logError(reason: string, e?: Error): void {
        if (e) {
            this._logger?.log(LogLevel.Error, `${reason}. Exception ${getExceptionMessage(e)}`);
            this._telemetry?.sendExceptionTelemetry(TelemetryEventName.INTELLICODE_ONNX_LOAD_FAILED, e);
        } else {
            this._logger?.log(LogLevel.Error, reason);
        }
    }
}
