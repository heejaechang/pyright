/// <reference path="../../../../pyright/packages/pyright-internal/src/tests/fourslash/fourslash.ts" />

declare namespace _ {
    interface Fourslash {
        verifySemanticTokens(
            data: { fileOrStartMarker: string; endMarker?: string; tokens: { type: string; modifiers?: string[] }[] }[]
        ): void;

        verifyExtractMethod(marker: string, edits: string[]): Promise<any>;
        verifyExtractVariable(marker: string, edits: string[]): Promise<any>;
        verifyPylanceCommand(command: Command, edits: string[] | WorkspaceEdit): Promise<any>;
        verifyRenameFiles(oldPath: string, newPath: string, edits: WorkspaceEdit): Promise<any>;
    }
}
