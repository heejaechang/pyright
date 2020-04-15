/*
 * deepLearning.ts
 *
 * IntelliCode core.
 */

import { ModuleNode } from '../pyright/server/src/parser/parseNodes';
import { LogLevel, LogService } from '../src/common/logger';
import { ExpressionWalker } from './expressionWalker';
import { EditorInvocation } from './models';
import { EditorLookBackTokenGenerator } from './tokens/editorTokenGenerator';

const LookbackTokenLength = 100;

export class DeepLearning {
    private _tokenIdMap = new Map<string, number>();

    lastInvocation: EditorInvocation | undefined;
    constructor(private _logger?: LogService) {}

    getRecommendations(
        content: string,
        ast: ModuleNode,
        expressionWalker: ExpressionWalker,
        position: number
    ): string[] {
        const tg = new EditorLookBackTokenGenerator();

        this.lastInvocation = tg.generateLookbackTokens(ast, content, expressionWalker, LookbackTokenLength, position);
        if (!this.lastInvocation) {
            this._logger?.log(
                LogLevel.Trace,
                'Current invocation parsing returned null, aborting IntelliCode recommendation!'
            );
            return [];
        }

        // Run the inference
        // const tokenIds =
        this.convertTokenToId(this.lastInvocation.lookbackTokens);

        // TODO: Tensor definitions are to be provided by ONNX.
        // var tensor = new DenseTensor<int>(tokenIds, new[] { 1, tokenIds.Length });
        // _inferenceInputs[0] = NamedOnnxValue.CreateFromTensor("input_batch:0", tensor);
        // var tensor2 = new DenseTensor<int>(_tensorMemory, _tensorDimension);
        // _inferenceInputs[1] = NamedOnnxValue.CreateFromTensor("lengths:0", tensor2);

        // Run the inference
        // using (var results = _session.Run(_inferenceInputs, new[] { "top_k:1" }))
        {
            // dump the results
            // for (const r of results as number[]) {
            //     for (const rr of r) {
            //         this._recommendations.push(this._tokens[rr]);
            //     }
            // }
        }

        return [];
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

        let unknownTokenId = this._tokenIdMap.entries.length;
        const unknownTokenIdMap = new Map<string, number>();

        // Replace out-of-vocabulary tokens with token ids dynamically generated
        // this is by design behavior.
        for (const token of lookbackTokens) {
            let t = this._tokenIdMap.get(token);
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
