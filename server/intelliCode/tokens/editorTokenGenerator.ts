/*
 * EditorTokenGenerator.ts
 *
 * Lookback token generator for IntelliCode in training mode.
 */

import { assert } from '../../pyright/server/src/common/debug';
import { ModuleNode } from '../../pyright/server/src/parser/parseNodes';
import { Token, TokenType } from '../../pyright/server/src/parser/tokenizerTypes';
import { ExpressionWalker } from '../expressionWalker';
import { EditorInvocation, LookbackTokenLength } from '../models';
import { LookBackTokenGenerator } from './lookbackTokenGenerator';
import { TokenSet, TokenValuePair } from './tokenSet';

export class EditorLookBackTokenGenerator extends LookBackTokenGenerator {
    // Used by online (editor) parser to generate context for deep LSTM model inferencing.
    generateLookbackTokens(
        ast: ModuleNode,
        content: string,
        ew: ExpressionWalker,
        position: number,
        lookback?: number
    ): EditorInvocation | undefined {
        const ts = this.extractTokens(ast, content);
        let method: string | undefined;
        let type: string | undefined;
        let spanStart = -1;

        lookback = lookback || LookbackTokenLength;

        const sorted = ew.methodInvokations.sort((a, b) => b.spanStart - a.spanStart);
        for (const mi of sorted) {
            type = mi.key;
            method = mi.value;

            // Find correct spanstart for current method invocation
            let mpos = ts.findMethodPosition(mi);
            if (mpos >= position) {
                continue;
            }
            // Extract current invocation for online use case, need to optimize for speed later.
            if (mpos < position - 1) {
                mpos = position - 1;
            }
            spanStart = mpos;
            break;
        }

        if (spanStart < 0 || !type) {
            return undefined;
        }

        const relevantName = ts.findRelevantName(spanStart);
        if (this.isTypeUnknown(type)) {
            if (!relevantName.value) {
                return undefined;
            }
            type = relevantName.value;
        }

        const lastInvocationIndex = ts.getSelectedTokenPositionIndex(spanStart);
        // If the last invocation is not found or not triggerred by ".", we return here.
        if (lastInvocationIndex < 0 || ts.selectedTokens[lastInvocationIndex].token.type !== TokenType.Dot) {
            return undefined;
        }

        // Point index to the next token, if it's not ".", will be replaced with "."
        const tokens = this.extractLookbackTokens(lookback, ts, type, lastInvocationIndex);
        if (!tokens) {
            return undefined;
        }

        // If there are fewer than 2 tokens return undefined.
        if (tokens.length <= 1) {
            return undefined;
        }

        if (!this.isTypeUnknown(type)) {
            // only if parent token type is inferred
            // normalize select tokens in the input sequence based on type
            for (let ii = 0; ii < tokens.length; ii++) {
                if (relevantName) {
                    if (tokens[ii].value === relevantName.value) {
                        tokens[ii].value = type;
                    }
                } else {
                    if (tokens[ii].value === tokens[tokens.length - 2].value) {
                        tokens[ii].value = type;
                    }
                }
            }

            // parent token normalization based on type
            if (!relevantName.value) {
                tokens[tokens.length - 2].value = type;
            }
        }

        return {
            spanStart: spanStart,
            lookbackTokens: this.reduceFunctionCallArguments(tokens),
            type: method ? `${type}.${method}` : type,
        };
    }

    private extractLookbackTokens(
        lookback: number,
        ts: TokenSet,
        type: string,
        lastInvocationIndex: number
    ): TokenValuePair[] | undefined {
        let count = lookback;
        let start = lastInvocationIndex - lookback + 1;
        if (start < 0) {
            start = 0;
            count = lastInvocationIndex + 1;
        }

        const end = start + count;
        assert(end >= start && end < ts.selectedTokens.length);

        const tokens = ts.selectedTokens.slice(start, end);
        // If token count is too small, return undefined.
        if (tokens.length <= 1) {
            return undefined;
        }

        const beforeLast = tokens[tokens.length - 2].token;
        if (beforeLast.type === TokenType.Number || this.isSymbol(beforeLast.type)) {
            return undefined;
        }

        // Enforce "." for the last token
        const last = tokens[tokens.length - 1].token;
        if (last.type !== TokenType.Dot && last.type !== TokenType.CloseParenthesis) {
            tokens[tokens.length - 1].token = Token.create(TokenType.Dot, last.start, 1, undefined);
            tokens[tokens.length - 1].value = '.';
            return tokens;
        }

        if (last.type === TokenType.Dot && beforeLast.type === TokenType.CloseParenthesis) {
            tokens[tokens.length - 1].token = Token.create(TokenType.NewLine, last.start, 1, undefined);
            tokens[tokens.length - 1].value = '\n';

            const typeToken = Token.create(TokenType.Identifier, last.start + 1, type.length, undefined);
            tokens.push({
                token: typeToken,
                value: type,
            });

            const dot = Token.create(TokenType.Dot, typeToken.start + typeToken.length, 1, undefined);
            tokens.push({
                token: dot,
                value: '.',
            });
        }

        return tokens;
    }

    private isSymbol(t: TokenType): boolean {
        return (
            t === TokenType.Arrow ||
            t === TokenType.Colon ||
            t === TokenType.Comma ||
            t === TokenType.Ellipsis ||
            t === TokenType.OpenBracket ||
            t === TokenType.OpenCurlyBrace ||
            t === TokenType.OpenParenthesis ||
            t === TokenType.Operator ||
            t === TokenType.Semicolon
        );
    }
}
