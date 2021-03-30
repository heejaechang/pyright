/*
 * TrainingTokenGenerator.ts
 *
 * Lookback token generator for IntelliCode in training mode.
 */

import { ParseResults } from 'pyright-internal/parser/parser';
import { TokenType } from 'pyright-internal/parser/tokenizerTypes';

import { ExpressionWalker } from '../expressionWalker';
import { LookbackTokenLength, TrainingInvocations } from '../models';
import { LookBackTokenGenerator } from './lookbackTokenGenerator';
import { integerBinarySearch, positionBinarySearch, TokenSet } from './tokenSet';

export class TrainingLookBackTokenGenerator extends LookBackTokenGenerator {
    // Used by offline parser to generate usage data for deep LSTM model training..
    generateLookbackTokens(
        parseResults: ParseResults,
        ew: ExpressionWalker,
        lookback?: number
    ): Map<string, Map<string, TrainingInvocations>> | undefined {
        const references = new Map<string, Map<string, TrainingInvocations>>();
        const ts = this.extractTokens(parseResults);

        lookback = lookback || LookbackTokenLength;
        for (const mi of ew.methodInvokations) {
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

            const tokenValues = this.extractLookbackTokens(ts, spanStart, type, relevantName.value, lookback);
            // If token count is only 1 (or smaller) then undefined is returned.
            if (tokenValues.length <= 1) {
                return undefined;
            }

            // Double check we are dealing with invocations only
            if (tokenValues[tokenValues.length - 2] !== '.') {
                continue;
            }
            // Put into references
            const invocations: TrainingInvocations = {
                spanStart: [spanStart],
                lookbackTokens: [tokenValues],
            };

            const methodsInvoked = references.get(type);
            if (methodsInvoked) {
                const functions = methodsInvoked.get(method);
                if (functions) {
                    functions.spanStart.push(spanStart);
                    functions.lookbackTokens.push(tokenValues);
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
        lookback?: number
    ): string[] {
        lookback = lookback || LookbackTokenLength;

        let methodInvocationIndex = positionBinarySearch(ts.selectedTokens, spanStart);
        if (methodInvocationIndex < 0) {
            methodInvocationIndex = ~methodInvocationIndex + 1;
        }

        let start = methodInvocationIndex - lookback + 1;
        let end = start + lookback;
        if (lookback > methodInvocationIndex) {
            start = 0;
            end = methodInvocationIndex + 1;
        }

        const tokens = ts.slice(start, end);
        // If token coult is not larger than 2, there's no point on continuing.
        if (tokens.length <= 2) {
            return tokens.map((t) => t.value);
        }
        // only if parent token type is inferred
        // normalize select tokens in the input sequence based on type
        if (tokens[tokens.length - 3].token.type === TokenType.CloseParenthesis) {
            const spanStartRightParenth = ts.selectedTokens[methodInvocationIndex - 2].token.start;
            const rightParenthIndex = integerBinarySearch(ts.rightParenthesisSpanStarts, spanStartRightParenth);
            relevantName = ts.relevantNames[rightParenthIndex];
            if (this.isTypeUnknown(type)) {
                type = relevantName;
            }
        }

        if (this.isTypeUnknown(type)) {
            return tokens.map((t) => t.value);
        }

        for (let i = 0; i < tokens.length; i++) {
            if (relevantName) {
                if (tokens[i].value === relevantName && i !== tokens.length - 1) {
                    tokens[i].value = type;
                }
            } else if (tokens[i].value === tokens[tokens.length - 3].value) {
                tokens[i].value = type;
            }
        }

        // parent token normalization based on type
        if (relevantName === '') {
            tokens[tokens.length - 3].value = type;
        }

        return this.reduceFunctionCallArguments(tokens);
    }
}
