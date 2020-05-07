/*
 * deepLearning.ts
 *
 * IntelliCode core.
 */

import { CancellationToken } from 'vscode-languageserver';

import { ModuleNode } from '../pyright/server/src/parser/parseNodes';
import { LogLevel, LogService } from '../src/common/logger';
import { sendExceptionTelemetry, TelemetryEventName, TelemetryService } from '../src/common/telemetry';
import { ExpressionWalker } from './expressionWalker';
import { PythiaModel } from './models';
import { EditorLookBackTokenGenerator } from './tokens/editorTokenGenerator';

const LookbackTokenLength = 100;

// TODO: remove when ONNX is available on other platforms.
let onnx: any;
if (isOnnxSupported()) {
    onnx = require('onnxruntime');
}

export function isOnnxSupported() {
    // IC is temporarily disabled until webpack native loader works.
    return false;
    // return process.platform === 'win32' && process.arch === 'x64';
}

export class DeepLearning {
    private _session: any; // InferenceSession;

    constructor(
        private readonly _model: PythiaModel,
        private readonly _logger?: LogService,
        private readonly _telemetry?: TelemetryService
    ) {}

    async initialize(): Promise<void> {
        this._session = await onnx.InferenceSession.create(this._model.onnxModelPath);
    }

    async getRecommendations(
        content: string,
        ast: ModuleNode,
        expressionWalker: ExpressionWalker,
        position: number,
        token: CancellationToken
    ): Promise<string[]> {
        if (!onnx) {
            return []; // Unsupported platform
        }

        const tg = new EditorLookBackTokenGenerator();
        const editorInvoke = tg.generateLookbackTokens(ast, content, expressionWalker, position);
        if (!editorInvoke) {
            this._logger?.log(LogLevel.Trace, 'Current invocation did not produce any meaningful tokens.');
            return [];
        }

        // Run the inference
        const recommendations: string[] = [];
        try {
            const tokenIds = this.convertTokenToId(editorInvoke.lookbackTokens);

            const tensor1 = new onnx.Tensor('int32', tokenIds, [1, tokenIds.length]);
            const tensor2 = new onnx.Tensor('int32', [LookbackTokenLength], [1]);
            const input = {
                ['input_batch:0']: tensor1,
                ['lengths:0']: tensor2,
            };

            const rt = await this._session.run(input, ['top_k:1']);
            if (token?.isCancellationRequested) {
                return [];
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
            this._logger?.log(LogLevel.Error, `IntelliCode exception: ${e.message}`);
            sendExceptionTelemetry(this._telemetry, TelemetryEventName.EXCEPTION_IC, e);
        }
        return recommendations;
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
}
