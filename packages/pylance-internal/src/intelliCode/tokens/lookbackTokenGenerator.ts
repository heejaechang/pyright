/*
 * lookBackTokenGenerator.ts
 *
 * Base class for lookback token production for IntelliCode.
 */

import { ParseResults } from 'pyright-internal/parser/parser';
import { IdentifierToken, Token, TokenType } from 'pyright-internal/parser/tokenizerTypes';

import { IntelliCodeConstants, LiteralTokenValue } from '../types';
import { TokenSet, TokenValuePair } from './tokenSet';

export abstract class LookBackTokenGenerator {
    extractTokens(parseResults: ParseResults): TokenSet {
        const braceTracker: number[] = []; // Tracks  ()
        const fnTracker: (Token | undefined)[] = []; // Tracks nested function calls like a(b(c()))

        const ts = new TokenSet();
        const tokens = parseResults.tokenizerOutput.tokens;

        let isPreviousTokenNewLine = false;

        for (let i = 0; i < tokens.count; i++) {
            const t = tokens.getItemAt(i);

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

            ts.addToken(t, this.getTokenValue(t, parseResults.text));
            isPreviousTokenNewLine = false;

            if (t.type === TokenType.OpenParenthesis) {
                braceTracker.push(i);
                fnTracker.push(i > 0 ? tokens.getItemAt(i - 1) : undefined);
                continue;
            }

            if (t.type === TokenType.CloseParenthesis && braceTracker.length > 0) {
                const openBraceIndex = braceTracker.pop();
                const fnToken = fnTracker.pop();
                // If it is simple function call, store function name.
                if (fnToken?.type === TokenType.Identifier) {
                    ts.leftParenthesisSpanStarts.push(tokens.getItemAt(openBraceIndex!).start);
                    ts.relevantNames.push((fnToken as IdentifierToken).value);
                    ts.rightParenthesisSpanStarts.push(t.start);
                }
            }
        }

        return ts;
    }

    // This function is used to check if the type of the invocation is unknown or null
    protected isTypeUnknown(type: string): boolean {
        return !type || type.startsWith(IntelliCodeConstants.UnresolvedType);
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
                        const fnToken = fnTracker.pop(); // can pop undefined
                        if (fnToken?.type === TokenType.Identifier) {
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
}
