/*
 * lookBackTokenGenerator.ts
 *
 * Base class for lookback token production for IntelliCode.
 */

import { ModuleNode } from '../../pyright/server/src/parser/parseNodes';
import { Tokenizer } from '../../pyright/server/src/parser/tokenizer';
import { TokenType } from '../../pyright/server/src/parser/tokenizerTypes';
import { IntelliCodeConstants } from '../types';
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
            ts.selectedTokensImages.push(content.substr(t.start, t.length));
            switch (t.type) {
                case TokenType.OpenParenthesis:
                    parenthesisTracker.push(t.start);
                    break;
                case TokenType.CloseParenthesis:
                    if (parenthesisTracker.length > 0) {
                        const leftParenthesisPos = parenthesisTracker.pop();
                        if (ts.hasLeftParenthesisAt(t.start)) {
                            break;
                        }
                        const index = ts.getSelectedTokenPositionIndex(t.start);
                        if (index >= 0) {
                            ts.leftParenthesisSpanStarts.push(leftParenthesisPos!);
                            ts.relevantNames.push(ts.selectedTokensImages[index - 1]);
                            ts.rightParenthesisSpanStarts.push(t.start);
                        }
                    }
            }
            isPreviousTokenNewLine = false;
        }
        return ts;
    }

    // This function is used to check if the type of the invocation is unknown or null
    protected isTypeUnknown(type: string): boolean {
        return type == null || type.startsWith(IntelliCodeConstants.UnresolvedType);
    }
}
