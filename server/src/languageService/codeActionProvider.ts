/*
 * codeActionProvider.ts
 * Copyright (c) Microsoft Corporation.
 *
 * Handles 'code actions' requests from the client.
 */

import { CancellationToken, CodeAction, CodeActionKind, Command } from 'vscode-languageserver';

import { throwIfCancellationRequested } from '../../pyright/server/src/common/cancellationUtils';
import { DiagnosticCategory } from '../../pyright/server/src/common/diagnostic';
import { DiagnosticRule } from '../../pyright/server/src/common/diagnosticRules';
import { Range } from '../../pyright/server/src/common/textRange';
import { WorkspaceServiceInstance } from '../../pyright/server/src/languageServerBase';
import { addImportSimilarityLimit, Commands } from '../commands/commands';

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

        const unknownSymbols: CodeAction[] = [];
        const unknownSymbolDiags = diags.filter(
            (d) =>
                d.getRule() === DiagnosticRule.reportUnboundVariable ||
                d.getRule() === DiagnosticRule.reportUndefinedVariable
        );
        if (unknownSymbolDiags.length > 0) {
            const diagRange = unknownSymbolDiags[0].range;

            // This requires binding, but binding doesn't allow cancellation.
            // If that becomes a problem, we need to either make binding cancellable or
            // precalculate all necessary information when diagnostics are generated
            const autoImports = workspace.serviceInstance.getAutoImports(
                filePath,
                diagRange,
                addImportSimilarityLimit,
                token
            );

            for (const result of autoImports) {
                throwIfCancellationRequested(token);

                if (result.name.startsWith('__')) {
                    // don't include any private symbol or module
                    continue;
                }

                const title = `Add import ${result.name} from ${result.source}`;
                unknownSymbols.push(
                    CodeAction.create(
                        title,
                        Command.create(title, Commands.addImport, filePath, diagRange, result.name, result.source),
                        CodeActionKind.QuickFix
                    )
                );
            }
        }

        return [...unusedImportCodeActions, ...unknownSymbols];
    }
}
