/*
 * tokenSet.ts
 *
 * Represents set of look back tokens for IntelliCode.
 */

import { binarySearch, binarySearchKey } from '../../pyright/server/src/common/collectionUtils';
import { Comparison, identity } from '../../pyright/server/src/common/core';
import { Token } from '../../pyright/server/src/parser/tokenizerTypes';
import { MethodInvokation } from '../types';

export function integerBinarySearch(array: number[], value: number): number {
    return binarySearch(array, value, identity, (a, b) => {
        return a < b ? Comparison.LessThan : a > b ? Comparison.GreaterThan : Comparison.EqualTo;
    });
}

export function positionBinarySearch(array: Token[], value: number): number {
    return binarySearchKey(
        array,
        value,
        t => t.start,
        (a, b) => {
            return a < b ? Comparison.LessThan : a > b ? Comparison.GreaterThan : Comparison.EqualTo;
        }
    );
}

export class TokenSet {
    selectedTokens: Token[] = [];
    selectedTokensImages: string[] = [];
    leftParenthesisSpanStarts: number[] = [];
    rightParenthesisSpanStarts: number[] = [];
    relevantNames: string[] = [];

    hasLeftParenthesisAt(position: number): boolean {
        return integerBinarySearch(this.leftParenthesisSpanStarts, position) >= 0;
    }

    hasRightParenthesisAt(position: number): boolean {
        return integerBinarySearch(this.rightParenthesisSpanStarts, position) >= 0;
    }

    hasSelectedTokenAt(position: number): boolean {
        return this.getSelectedTokenPositionIndex(position) >= 0;
    }

    getSelectedTokenPositionIndex(position: number): number {
        return positionBinarySearch(this.selectedTokens, position);
    }

    findMethodPosition(mi: MethodInvokation): number {
        // Find correct spanstart for current method invocation
        const end = positionBinarySearch(this.selectedTokens, mi.spanStart) + 1;

        for (let i = this.selectedTokensImages.length - 1; i > end && i > 0; i--) {
            const ti = this.selectedTokensImages[i];
            if (ti === mi.value) {
                return this.selectedTokens[i].start;
            }
        }
        return -1;
    }

    findRelevantName(position: number): { value: string | undefined; position: number } {
        const leftParenthesisIndex = integerBinarySearch(this.leftParenthesisSpanStarts, position);
        if (leftParenthesisIndex >= 0) {
            return {
                value: this.relevantNames[leftParenthesisIndex],
                position: this.rightParenthesisSpanStarts[leftParenthesisIndex] + 1
            };
        }
        return { value: undefined, position: 0 };
    }
}
