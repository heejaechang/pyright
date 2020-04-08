/*
 * EditorTokenGenerator.ts
 *
 * Lookback token generator for IntelliCode in training mode.
 */

import { assert } from '../../pyright/server/src/common/debug';
import { ModuleNode } from '../../pyright/server/src/parser/parseNodes';
import { TokenType } from '../../pyright/server/src/parser/tokenizerTypes';
import { ExpressionWalker } from '../expressionWalker';
import { EditorInvocation } from '../models';
import { LookBackTokenGenerator } from './lookbackTokenGenerator';
import { TokenSet } from './tokenSet';

export class EditorLookBackTokenGenerator extends LookBackTokenGenerator {
    // Used by online (editor) parser to generate context for deep LSTM model inferencing.
    generateLookbackTokens(
        ast: ModuleNode,
        content: string,
        ew: ExpressionWalker,
        lookback: number,
        position: number
    ): EditorInvocation | undefined {
        const ts = this.extractTokens(ast, content);
        // Walk backwards through method invocation
        let type: string | undefined;
        let spanStart = -1;

        for (let i = ew.methodInvokations.length - 1; i >= 0; i--) {
            const mi = ew.methodInvokations[i];
            type = mi.key;

            // Find correct spanstart for current method invocation
            let mpos = ts.findMethodPosition(mi);

            // Extract current invocation for online use case, need to optimize for speed later.
            if (mpos >= position) {
                continue;
            }

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
        if (lastInvocationIndex < 0 || ts.selectedTokensImages[lastInvocationIndex] != '.') {
            return undefined;
        }

        // Point index to the next token, if it's not ".", will be replaced with "."
        const tokenImages = this.extractLookbackTokens(lookback, ts, type, lastInvocationIndex);

        // If token images is undefined or token images has fewer than 2 elements.
        // If token image previous element was a symbol or number, extractLookbackTokens
        // returns undefined.
        if (!tokenImages || tokenImages.length <= 1) {
            return undefined;
        }

        if (!this.isTypeUnknown(type)) {
            // only if parent token type is inferred
            // normalize select tokens in the input sequence based on type
            for (let ii = 0; ii < tokenImages.length; ii++) {
                if (relevantName) {
                    if (tokenImages[ii] === relevantName.value) {
                        tokenImages[ii] = type;
                    }
                } else {
                    if (tokenImages[ii] == tokenImages[tokenImages.length - 2]) {
                        tokenImages[ii] = type;
                    }
                }
            }

            // parent token normalization based on type
            if (!relevantName.value) {
                tokenImages[tokenImages.length - 2] = type;
            }
        }

        return {
            spanStart: spanStart,
            lookbackTokens: tokenImages,
            type: type,
        };
    }

    private extractLookbackTokens(
        lookback: number,
        ts: TokenSet,
        type: string,
        lastInvocationIndex: number
    ): string[] | undefined {
        let count = lookback;
        let start = lastInvocationIndex - lookback + 1;
        if (start < 0) {
            start = 0;
            count = lastInvocationIndex + 1;
        }

        const end = start + count;
        assert(end >= start && end < ts.selectedTokens.length);
        assert(ts.selectedTokens.length == ts.selectedTokensImages.length);

        const tokenImages = ts.selectedTokensImages.slice(start, end);
        // If token images count is only 1 (or smaller) then null is undefined.
        if (tokenImages.length <= 1) {
            return undefined;
        }

        const tokens = ts.selectedTokens.slice(start, end);
        const beforeLast = tokens[tokens.length - 2];
        if (beforeLast.type === TokenType.Number || this.isSymbol(beforeLast.type)) {
            return undefined;
        }

        // Enforce "." for the last token
        const last = tokens[tokens.length - 1];
        if (last.type != TokenType.Dot && last.type != TokenType.CloseParenthesis) {
            tokenImages[tokenImages.length - 1] = '.';
            return tokenImages;
        }

        if (last.type === TokenType.Dot && beforeLast.type === TokenType.CloseParenthesis) {
            tokenImages[tokenImages.length - 1] = '\n';
            tokenImages.push(type);
            tokenImages.push('.');
        }

        return tokenImages;
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
