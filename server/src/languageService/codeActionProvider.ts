/*
 * codeActionProvider.ts
 * Copyright (c) Microsoft Corporation.
 *
 * Handles 'code actions' requests from the client.
 */

import { CancellationToken, CodeAction, CodeActionKind, Command } from 'vscode-languageserver';

import { throwIfCancellationRequested } from '../../pyright/server/src/common/cancellationUtils';
import { DiagnosticCategory } from '../../pyright/server/src/common/diagnostic';
import { Range } from '../../pyright/server/src/common/textRange';
import { WorkspaceServiceInstance } from '../../pyright/server/src/languageServerBase';
import { Commands } from '../commands/commands';

export class CodeActionProvider {
    static async getCodeActionsForPosition(
        workspace: WorkspaceServiceInstance,
        filePath: string,
        range: Range,
        token: CancellationToken
    ) {
        throwIfCancellationRequested(token);

        if (workspace.disableLanguageServices) {
            return [];
        }

        const diags = await workspace.serviceInstance.getDiagnosticsForRange(filePath, range, token);
        const unusedImportCodeActions = diags
            .filter((d) => d.category === DiagnosticCategory.UnusedCode)
            .map((d) => {
                return CodeAction.create(
                    `Remove unused import`,
                    Command.create('Remove unused import', Commands.removeUnusedImport, filePath, d.range),
                    CodeActionKind.QuickFix
                );
            });

        return [...unusedImportCodeActions];
    }
}
