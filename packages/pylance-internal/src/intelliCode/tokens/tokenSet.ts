/*
 * tokenSet.ts
 *
 * Represents set of look back tokens for IntelliCode.
 */

import { binarySearch, binarySearchKey } from 'pyright-internal/common/collectionUtils';
import { Comparison, identity } from 'pyright-internal/common/core';
import { Token } from 'pyright-internal/parser/tokenizerTypes';

import { MethodInvokation } from '../types';

export function integerBinarySearch(array: number[], value: number): number {
    return binarySearch(array, value, identity, (a, b) => {
        return a < b ? Comparison.LessThan : a > b ? Comparison.GreaterThan : Comparison.EqualTo;
    });
}

export function positionBinarySearch(array: TokenValuePair[], value: number): number {
    return binarySearchKey(
        array,
        value,
        (p) => p.token.start,
        (a, b) => {
            return a < b ? Comparison.LessThan : a > b ? Comparison.GreaterThan : Comparison.EqualTo;
        }
    );
}

export class TokenValuePair {
    constructor(public token: Token, public value: string) {}
}

export class TokenSet {
    selectedTokens: TokenValuePair[] = [];
    leftParenthesisSpanStarts: number[] = [];
    rightParenthesisSpanStarts: number[] = [];
    relevantNames: string[] = [];

    slice(start: number, end: number): TokenValuePair[] {
        const tokens: TokenValuePair[] = [];
        for (let i = start; i < end; i++) {
            tokens.push(new TokenValuePair(this.selectedTokens[i].token, this.selectedTokens[i].value));
        }
        return tokens;
    }

    addToken(token: Token, value: string) {
        this.selectedTokens.push(new TokenValuePair(token, value));
    }

    getSelectedTokenPositionIndex(position: number): number {
        return positionBinarySearch(this.selectedTokens, position);
    }

    findMethodPosition(mi: MethodInvokation): number {
        // Find correct spanstart for current method invocation
        let startIdx = positionBinarySearch(this.selectedTokens, mi.spanStart);

        // Binary search returns neg index of twos compliment of the next index if no exact match is found
        // so exclude + 1
        if (startIdx < 0) {
            startIdx = ~startIdx;
        }

        if (startIdx >= 0 && startIdx < this.selectedTokens.length) {
            for (let i = startIdx; i < this.selectedTokens.length; i++) {
                const ti = this.selectedTokens[i];
                if (ti.value === mi.value) {
                    return ti.token.start;
                }
            }
        }

        return -1;
    }

    findRelevantName(position: number): { value: string | undefined; position: number } {
        const leftParenthesisIndex = integerBinarySearch(this.leftParenthesisSpanStarts, position);
        if (leftParenthesisIndex >= 0) {
            return {
                value: this.relevantNames[leftParenthesisIndex],
                position: this.rightParenthesisSpanStarts[leftParenthesisIndex] + 1,
            };
        }
        return { value: undefined, position: 0 };
    }
}
