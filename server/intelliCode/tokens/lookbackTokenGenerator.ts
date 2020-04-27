/*
 * lookBackTokenGenerator.ts
 *
 * Base class for lookback token production for IntelliCode.
 */

import { ModuleNode } from '../../pyright/server/src/parser/parseNodes';
import { Tokenizer } from '../../pyright/server/src/parser/tokenizer';
import { IdentifierToken, Token, TokenType } from '../../pyright/server/src/parser/tokenizerTypes';
import { IntelliCodeConstants, LiteralTokenValue } from '../types';
import { TokenSet, TokenValuePair } from './tokenSet';

export abstract class LookBackTokenGenerator {
    extractTokens(ast: ModuleNode, content: string): TokenSet {
        const braceTracker: number[] = []; // Tracks  ()
        const bracketTracker: number[] = []; // Tracks []
        const curlyTracker: number[] = []; // Tracks {}
        const fnTracker: (Token | undefined)[] = []; // Tracks nested function calls like a(b(c()))

        const ts = new TokenSet();
        const tokens: Token[] = [];
        const tokenCollection = new Tokenizer().tokenize(content).tokens;
        for (let i = 0; i < tokenCollection.count; i++) {
            tokens.push(tokenCollection.getItemAt(i));
        }

        let isPreviousTokenNewLine = false;

        for (let i = 0; i < tokens.length; i++) {
            const t = tokens[i];

            switch (t.type) {
                case TokenType.Indent:
                case TokenType.Dedent:
                case TokenType.Comma:
                case TokenType.Colon:
                    continue;
            }

            if (t.type === TokenType.NewLine) {
                if (!isPreviousTokenNewLine) {
                    ts.addToken(t, '\n');
                    isPreviousTokenNewLine = true;
                }
                continue;
            }

            if (t.type === TokenType.Number || t.type === TokenType.String) {
                // Ignore literals in braces
                if (bracketTracker.length > 0 || curlyTracker.length > 0 || braceTracker.length > 0) {
                    continue;
                }
            }

            ts.addToken(t, this.getTokenValue(t, content));
            isPreviousTokenNewLine = false;

            this.handleBraces(bracketTracker, t, TokenType.OpenBracket, TokenType.CloseBracket);
            this.handleBraces(curlyTracker, t, TokenType.OpenCurlyBrace, TokenType.CloseCurlyBrace);

            if (t.type === TokenType.OpenParenthesis) {
                braceTracker.push(i);
                fnTracker.push(i > 0 ? tokens[i - 1] : undefined);
                continue;
            }

            if (t.type === TokenType.CloseParenthesis && braceTracker.length > 0) {
                const openBraceIndex = braceTracker.pop();
                const fnToken = fnTracker.pop();
                // If it is simple function call, store function name.
                if (fnToken?.type === TokenType.Identifier) {
                    ts.leftParenthesisSpanStarts.push(tokens[openBraceIndex!].start);
                    ts.relevantNames.push((fnToken as IdentifierToken).value);
                    ts.rightParenthesisSpanStarts.push(t.start);
                }
                // If it is tuple, leave () and drop everything inside ().
                if (fnToken?.type !== TokenType.Identifier && fnToken?.type !== TokenType.CloseParenthesis) {
                    const start = openBraceIndex! + 1;
                    const end = ts.selectedTokens.length - 1;
                    if (end > start + 1) {
                        ts.selectedTokens.splice(openBraceIndex! + 1, end - start);
                    }
                }
            }
        }

        return ts;
    }

    // This function is used to check if the type of the invocation is unknown or null
    protected isTypeUnknown(type: string): boolean {
        return type === null || type.startsWith(IntelliCodeConstants.UnresolvedType);
    }

    protected reduceFunctionCallArguments(tokens: TokenValuePair[]): string[] {
        const braces: number[] = [];
        const fnTracker: (Token | undefined)[] = []; // Tracks nested function calls like a(b(c()))

        for (let i = 0; i < tokens.length; i++) {
            const t = tokens[i].token;

            switch (t.type) {
                case TokenType.OpenParenthesis: {
                    // Remember if this was a function call since we don't
                    // want to wipe out tuple braces.
                    const prevToken = i > 0 ? tokens[i - 1] : undefined;
                    fnTracker.push(prevToken?.token);
                    braces.push(i);
                    if (prevToken?.token.type === TokenType.Identifier) {
                        tokens[i].value = '';
                    }
                    break;
                }

                case TokenType.CloseParenthesis:
                    if (braces.length > 0) {
                        const openBraceIndex = braces.pop();
                        const fnToken = fnTracker.pop();
                        if (fnToken!.type === TokenType.Identifier) {
                            // We only clear arguments on closing brace since
                            // in case of a method invoke inside argument like in
                            // 'a(b.x)' tokens come as 'a(b.x' and we don't want
                            // b.x to be wiped out.
                            for (let j = openBraceIndex!; j <= i; j++) {
                                tokens[j].value = '';
                            }
                        }
                    }
                    break;
            }
        }
        return tokens.map((t) => t.value).filter((v) => v !== '');
    }

    private getTokenValue(t: Token, content: string): string {
        switch (t.type) {
            case TokenType.String:
                return LiteralTokenValue.String;
            case TokenType.Number:
                return LiteralTokenValue.Number;
        }
        return content.substr(t.start, t.length);
    }

    // Counts braces and tells if braces are nested.
    private handleBraces(counter: number[], t: Token, openType: TokenType, closeType: TokenType): void {
        if (t.type === openType) {
            counter.push(t.start);
        } else if (t.type === closeType && counter.length > 0) {
            counter.pop();
        }
    }
}
