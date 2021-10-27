/*
 * EditorTokenGenerator.ts
 *
 * Lookback token generator for IntelliCode in training mode.
 */

import { findNodeByOffset } from 'pyright-internal/analyzer/parseTreeUtils';
import { assert } from 'pyright-internal/common/debug';
import { ParseNode, ParseNodeType } from 'pyright-internal/parser/parseNodes';
import { ParseResults } from 'pyright-internal/parser/parser';
import { Token, TokenType } from 'pyright-internal/parser/tokenizerTypes';

import { ExpressionWalker } from '../expressionWalker';
import { EditorInvocation, LookbackTokenLength } from '../models';
import { LookBackTokenGenerator } from './lookbackTokenGenerator';
import { TokenSet, TokenValuePair } from './tokenSet';

export class EditorLookBackTokenGenerator extends LookBackTokenGenerator {
    // Used by online (editor) parser to generate context for deep LSTM model inferencing.
    generateLookbackTokens(
        parseResults: ParseResults,
        ew: ExpressionWalker,
        position: number,
        lookback?: number
    ): EditorInvocation | undefined {
        const ts = this.extractTokens(parseResults);
        let method: string | undefined;
        let type: string | undefined;
        let spanStart = -1;

        lookback = lookback || LookbackTokenLength;

        const sorted = ew.methodInvokations.sort((a, b) => b.spanStart - a.spanStart);
        let startIdx = sorted.findIndex((m) => m.spanStart < position);
        if (startIdx < 0) {
            return undefined;
        }

        // Now that we found the span less than position move the idex one back, to a spanStart greater than position
        startIdx = startIdx === 0 ? startIdx : startIdx - 1;

        for (let i = startIdx; i < sorted.length; i++) {
            const mi = sorted[i];
            type = mi.key;
            method = mi.value;

            // Find correct spanstart for current method invocation
            let mpos = ts.findMethodPosition(mi);
            if (mpos > position) {
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
            if (relevantName.value) {
                type = relevantName.value;
            }
        }

        if (type === undefined) {
            return;
        }

        // Restrict innovcation locations to dot or member access
        if (!_isValidInvocation(spanStart, parseResults)) {
            return;
        }

        const lastInvocationIndex = _getLastInvocationIndex(spanStart);
        if (lastInvocationIndex < 0 || lastInvocationIndex >= ts.selectedTokens.length) {
            return;
        }

        // Point index to the next token, if it's not ".", will be replaced with "."
        const tokens = this.extractLookbackTokens(lookback, ts, type, lastInvocationIndex);

        // If there are fewer than 2 tokens return undefined.
        if (!tokens || tokens.length <= 1) {
            return undefined;
        }

        if (!this.isTypeUnknown(type)) {
            // only if parent token type is inferred
            // normalize select tokens in the input sequence based on type
            for (let ii = tokens.length - 1; ii > 2; ii--) {
                if (relevantName.value) {
                    if (tokens[ii].value === relevantName.value) {
                        tokens[ii].value = type;
                        break;
                    }
                } else {
                    if (tokens[ii].value === tokens[tokens.length - 2].value) {
                        tokens[ii].value = type;
                        break;
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
            lookbackTokens: tokens.map((t) => t.value),
            type: method ? `${type}.${method}` : type,
        };

        function _getLastInvocationIndex(spanStart: number) {
            let lastInvocationIndex = ts.getSelectedTokenPositionIndex(spanStart);
            // if negative binary search returns twos compliment of next highest element
            if (lastInvocationIndex < 0) {
                lastInvocationIndex = ~lastInvocationIndex + 1;
            }

            // Search back for last "."
            if (lastInvocationIndex < ts.selectedTokens.length) {
                while (lastInvocationIndex >= 0) {
                    const curToken = ts.selectedTokens[lastInvocationIndex].token;
                    if (curToken.type === TokenType.Dot) {
                        break;
                    }

                    // Disable recommendations if we hit an openbracket before '.'
                    if (
                        curToken.start <= spanStart &&
                        (curToken.type === TokenType.OpenParenthesis ||
                            curToken.type === TokenType.OpenBracket ||
                            curToken.type === TokenType.OpenCurlyBrace)
                    ) {
                        return -1;
                    }

                    lastInvocationIndex -= 1;
                }
            }
            return lastInvocationIndex;
        }

        function _isValidInvocation(spanStart: number, parseResults: ParseResults) {
            const startIndex = ts.getSelectedTokenPositionIndex(spanStart);
            const isDot = startIndex > 0 && ts.selectedTokens[startIndex].token.type === TokenType.Dot;
            if (isDot) {
                return true;
            }

            const moduleNode = parseResults.parseTree as ParseNode;
            const curNode = findNodeByOffset(moduleNode, spanStart);
            const isMemberAccess =
                curNode &&
                curNode.nodeType === ParseNodeType.Name &&
                curNode.parent?.nodeType === ParseNodeType.MemberAccess &&
                curNode === curNode.parent?.memberName;

            return isMemberAccess;
        }
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
