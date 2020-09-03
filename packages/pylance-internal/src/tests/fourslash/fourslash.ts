/// <reference path="../../../../pyright/packages/pyright-internal/src/tests/fourslash/fourslash.ts" />

declare namespace _ {
    interface Fourslash {
        verifySemanticTokens(
            data: { fileOrStartMarker: string; endMarker?: string; tokens: { type: string; modifiers?: string[] }[] }[]
        ): void;
    }
}
