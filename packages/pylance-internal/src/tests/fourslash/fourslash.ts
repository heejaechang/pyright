/// <reference path="../../../../pyright/packages/pyright-internal/src/tests/fourslash/fourslash.ts" />

declare namespace _ {
    interface Fourslash {
        verifySemanticTokens(
            data: { fileOrStartMarker: string; endMarker?: string; tokens: { type: string; modifiers?: string[] }[] }[]
        ): void;

        verifyExtractMethod(marker: string, files: { [filePath: string]: string[] }): Promise<any>;
        verifyExtractVariable(marker: string, files: { [filePath: string]: string[] }): Promise<any>;
        verifyPylanceCommand(command: Command, files: { [filePath: string]: string[] }): Promise<any>;
    }
}
