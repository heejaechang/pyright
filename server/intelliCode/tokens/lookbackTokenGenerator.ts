/*
 * lookBackTokenGenerator.ts
 *
 * Base class for lookback token production for IntelliCode.
 */

import { ModuleNode } from '../../pyright/server/src/parser/parseNodes';
import { Tokenizer } from '../../pyright/server/src/parser/tokenizer';
import { Token, TokenType } from '../../pyright/server/src/parser/tokenizerTypes';
import { IntelliCodeConstants, LiteralTokenImage } from '../types';
import { TokenSet } from './tokenSet';

export abstract class LookBackTokenGenerator {
    extractTokens(ast: ModuleNode, content: string): TokenSet {
        const parenthesisTracker: number[] = [];
        const to = new Tokenizer().tokenize(content);
        const ts = new TokenSet();

        let isPreviousTokenNewLine = false;
        for (let i = 0; i < to.tokens.count; i++) {
            const t = to.tokens.getItemAt(i);
            if (t.type === TokenType.Indent || t.type === TokenType.Dedent) {
                continue;
            }

            if (t.type === TokenType.NewLine) {
                if (!isPreviousTokenNewLine) {
                    ts.selectedTokens.push(t);
                    ts.selectedTokensImages.push('\n');
                    isPreviousTokenNewLine = true;
                }
                continue;
            }

            ts.selectedTokens.push(t);
            ts.selectedTokensImages.push(this.getTokenImage(t, content));
            isPreviousTokenNewLine = false;

            if (t.type === TokenType.OpenParenthesis) {
                parenthesisTracker.push(t.start);
                continue;
            }

            if (t.type === TokenType.CloseParenthesis && parenthesisTracker.length > 0) {
                const leftParenthesisPos = parenthesisTracker.pop();
                if (ts.hasLeftParenthesisAt(t.start)) {
                    continue;
                }
                const index = ts.getSelectedTokenPositionIndex(leftParenthesisPos!);
                if (index >= 0) {
                    ts.leftParenthesisSpanStarts.push(leftParenthesisPos!);
                    ts.relevantNames.push(ts.selectedTokensImages[index - 1]);
                    ts.rightParenthesisSpanStarts.push(t.start);
                }
            }
        }
        return ts;
    }

    // This function is used to check if the type of the invocation is unknown or null
    protected isTypeUnknown(type: string): boolean {
        return type == null || type.startsWith(IntelliCodeConstants.UnresolvedType);
    }

    protected filterTokens(tokenImages: string[]): string[] {
        const braces: number[] = [];
        for (let i = 0; i < tokenImages.length; i++) {
            switch (tokenImages[i]) {
                case '(':
                    braces.push(i);
                    tokenImages[i] = '';
                    break;
                case ')':
                    if (braces.length > 0) {
                        braces.pop();
                        tokenImages[i] = '';
                    }
                    break;
                default:
                    if (braces.length > 0) {
                        tokenImages[i] = '';
                    }
                    break;
            }
        }
        return tokenImages.filter((t) => t != '');
    }

    private getTokenImage(t: Token, content: string): string {
        switch (t.type) {
            case TokenType.String:
                return LiteralTokenImage.String;
            case TokenType.Number:
                return LiteralTokenImage.Number;
        }
        return content.substr(t.start, t.length);
    }
}
