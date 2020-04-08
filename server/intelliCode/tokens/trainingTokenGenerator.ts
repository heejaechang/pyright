/*
 * TrainingTokenGenerator.ts
 *
 * Lookback token generator for IntelliCode in training mode.
 */

import { ModuleNode } from '../../pyright/server/src/parser/parseNodes';
import { ExpressionWalker } from '../expressionWalker';
import { TrainingInvocations } from '../models';
import { LookBackTokenGenerator } from './lookbackTokenGenerator';
import { integerBinarySearch, positionBinarySearch, TokenSet } from './tokenSet';

export class TrainingLookBackTokenGenerator extends LookBackTokenGenerator {
    // Used by offline parser to generate usage data for deep LSTM model training..
    generateLookbackTokens(
        ast: ModuleNode,
        content: string,
        ew: ExpressionWalker,
        lookback: number
    ): Map<string, Map<string, TrainingInvocations>> | undefined {
        const references = new Map<string, Map<string, TrainingInvocations>>();
        const ts = this.extractTokens(ast, content);

        for (const mi of ew.methodInvokations.filter((m) => m.value)) {
            let type = mi.key;
            const method = mi.value;
            if (!method) {
                continue;
            }
            // Find correct spanstart for current method invocation
            const spanStart = ts.findMethodPosition(mi);
            const relevantName = ts.findRelevantName(spanStart);
            if (this.isTypeUnknown(type) && relevantName.value) {
                type = relevantName.value;
            }

            const tokenImages = this.extractLookbackTokens(ts, spanStart, type, relevantName.value, lookback);
            // If token images count is only 1 (or smaller) then undefined is returned.
            if (tokenImages.length <= 1) {
                return undefined;
            }

            // Double check we are dealing with invocations only
            if (tokenImages[tokenImages.length - 2] != '.') {
                continue;
            }
            // put into references
            const invocations: TrainingInvocations = {
                spanStart: [],
                lookbackTokens: [tokenImages],
            };

            const methodsInvoked = references.get(type);
            if (methodsInvoked) {
                const functions = methodsInvoked.get(method);
                if (functions) {
                    functions.spanStart.push(spanStart);
                    functions.lookbackTokens.push(tokenImages);
                } else {
                    methodsInvoked.set(method, invocations);
                }
            } else {
                references.set(type, new Map<string, TrainingInvocations>().set(method, invocations));
            }
        }
        return references;
    }

    private extractLookbackTokens(
        ts: TokenSet,
        spanStart: number,
        type: string,
        relevantName: string | undefined,
        lookback: number
    ): string[] {
        let methodInvocationIndex = positionBinarySearch(ts.selectedTokens, spanStart);
        if (methodInvocationIndex < 0) {
            methodInvocationIndex = ~methodInvocationIndex + 1;
        }
        let start = methodInvocationIndex - lookback + 1;
        let count = lookback;
        if (lookback > methodInvocationIndex) {
            start = 0;
            count = methodInvocationIndex + 1;
        }
        const tokenImages = ts.selectedTokensImages.slice(start, start + count);
        // If token images is not larger than 2, there's no point on continuing, we return token_images.
        if (tokenImages.length <= 2) {
            return tokenImages;
        }
        // only if parent token type is inferred
        // normalize select tokens in the input sequence based on type
        if (tokenImages[tokenImages.length - 3] == ')') {
            const spanStartRightParenth = ts.selectedTokens[methodInvocationIndex - 2].start;
            const rightParenthIndex = integerBinarySearch(ts.rightParenthesisSpanStarts, spanStartRightParenth);
            relevantName = ts.relevantNames[rightParenthIndex];
            if (this.isTypeUnknown(type)) {
                type = relevantName;
            }
        }

        if (this.isTypeUnknown(type)) {
            return tokenImages;
        }

        for (let ii = 0; ii < tokenImages.length; ii++) {
            if (relevantName) {
                if (tokenImages[ii] === relevantName && ii != tokenImages.length - 1) {
                    tokenImages[ii] = type;
                }
            } else if (tokenImages[ii] == tokenImages[tokenImages.length - 3]) {
                tokenImages[ii] = type;
            }
        }

        // parent token normalization based on type
        if (relevantName == '') {
            tokenImages[tokenImages.length - 3] = type;
        }

        return tokenImages;
    }
}
