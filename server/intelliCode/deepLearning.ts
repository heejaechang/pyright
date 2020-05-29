/*
 * deepLearning.ts
 *
 * IntelliCode core.
 */

import { CancellationToken } from 'vscode-languageserver';

import { assert } from '../pyright/server/src/common/debug';
import { ModuleNode } from '../pyright/server/src/parser/parseNodes';
import { LogLevel, LogService } from '../src/common/logger';
import { Platform } from '../src/common/platform';
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
    private _onnx: any; // require('onnxruntime')
    private _session: any; // InferenceSession;

    constructor(
        private readonly _model: PythiaModel,
        private readonly _platform: Platform,
        private readonly _logger?: LogService
    ) {}

    async initialize(): Promise<any> {
        if (!this._platform.isOnnxSupported()) {
            this._logger?.log(LogLevel.Warning, 'IntelliCode is not supported on this platform.');
            return;
        }

        if (!this._onnx) {
            this._logger?.log(LogLevel.Trace, 'Loading ONNX runtime...');
            try {
                this._onnx = require('onnxruntime');
                this._logger?.log(LogLevel.Trace, 'Loaded ONNX runtime. Creating IntelliCode session...');
            } catch {
                this._logger?.log(LogLevel.Trace, 'Failed to load ONNX runtime.');
            }
        }

        assert(this._onnx);
        assert(this._onnx.InferenceSession);
        assert(this._onnx.InferenceSession.create);

        this._session = await this._onnx.InferenceSession.create(this._model.onnxModelPath, {
            logSeverityLevel: this.getOnnxLogLevel(),
        });
        this._logger?.log(LogLevel.Trace, 'Created IntelliCode session.');
    }

    async getRecommendations(
        content: string,
        ast: ModuleNode,
        expressionWalker: ExpressionWalker,
        position: number,
        token: CancellationToken
    ): Promise<DeepLearningResult> {
        if (!this._onnx) {
            return EmptyResult; // Unsupported platform
        }

        const tg = new EditorLookBackTokenGenerator();
        const invocation = tg.generateLookbackTokens(ast, content, expressionWalker, position);
        if (!invocation) {
            this._logger?.log(LogLevel.Trace, 'IntelliCode: current invocation did not produce any meaningful tokens.');
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
            this._logger?.log(LogLevel.Error, `IntelliCode exception: ${e.stack}`);
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

    private getOnnxLogLevel(): number {
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
            case LogLevel.Warning:
            case LogLevel.Info:
                return 3;
            case LogLevel.Trace:
                return 0;
        }
        return 1;
    }
}
