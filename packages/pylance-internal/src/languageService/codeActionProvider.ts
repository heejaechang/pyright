/*
 * codeActionProvider.ts
 * Copyright (c) Microsoft Corporation.
 *
 * Handles 'code actions' requests from the client.
 */

import { CancellationToken, CodeAction, CodeActionKind, Command } from 'vscode-languageserver';

import { Commands as PyrightCommands } from 'pyright-internal/commands/commands';
import { throwIfCancellationRequested } from 'pyright-internal/common/cancellationUtils';
import { DiagnosticCategory } from 'pyright-internal/common/diagnostic';
import { DiagnosticRule } from 'pyright-internal/common/diagnosticRules';
import { convertRangeToTextRange } from 'pyright-internal/common/positionUtils';
import { getCharacterCount } from 'pyright-internal/common/stringUtils';
import { Range } from 'pyright-internal/common/textRange';
import { getAutoImportText } from 'pyright-internal/languageService/tooltipUtils';

import { PylanceWorkspaceServiceInstance } from '../../src/server';
import { Commands } from '../commands/commands';
import { addImportSimilarityLimit, wellKnownAbbreviationMap } from '../common/importUtils';
import { CannotExtractReason, ExtractMethodProvider } from './refactoringProvider';

export class CodeActionProvider {
    static async getCodeActionsForPosition(
        workspace: PylanceWorkspaceServiceInstance,
        filePath: string,
        range: Range,
        token: CancellationToken
    ) {
        throwIfCancellationRequested(token);

        if (workspace.disableLanguageServices) {
            return [];
        }

        const codeActions: CodeAction[] = [];
        const diags = await workspace.serviceInstance.getDiagnosticsForRange(filePath, range, token);
        const unusedImportDiags = diags.filter(
            (d) =>
                d.category === DiagnosticCategory.UnusedCode &&
                d.getActions()?.some((a) => a.action === PyrightCommands.unusedImport)
        );

        if (unusedImportDiags.length > 0) {
            const diagRange = unusedImportDiags[0].range;
            codeActions.push(
                CodeAction.create(
                    `Remove unused import`,
                    Command.create('Remove unused import', Commands.removeUnusedImport, filePath, diagRange),
                    CodeActionKind.QuickFix
                )
            );
        }

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
                wellKnownAbbreviationMap,
                /* lazyEdit */ true,
                /* allowVariableInAll */ true,
                token
            );

            const addImportsCodeActions = [];
            for (const result of autoImports) {
                throwIfCancellationRequested(token);

                if (result.name.startsWith('__')) {
                    // don't include any private symbol or module
                    continue;
                }

                const title = `Add "${getAutoImportText(result.name, result.source, result.alias)}"`;
                addImportsCodeActions.push(
                    CodeAction.create(
                        title,
                        Command.create(title, Commands.addImport, filePath, diagRange, result.name, result.source),
                        CodeActionKind.QuickFix
                    )
                );
            }

            const writtenWord = workspace.serviceInstance.getTextOnRange(filePath, diagRange, token);
            codeActions.push(
                ...addImportsCodeActions.sort((left, right) => {
                    const leftName = left.command!.arguments![2] as string;
                    const rightName = right.command!.arguments![2] as string;

                    if (leftName === rightName) {
                        return addImportCompare(left, right);
                    }

                    if (leftName === writtenWord) {
                        return -1;
                    }

                    if (rightName === writtenWord) {
                        return 1;
                    }

                    return addImportCompare(left, right);
                })
            );
        }

        if (workspace.enableExtractCodeAction) {
            const parseResults = workspace.serviceInstance.getParseResult(filePath);
            if (parseResults) {
                const textRange = convertRangeToTextRange(range, parseResults.tokenizerOutput.lines);
                if (textRange) {
                    const tryExtractMethodResults = ExtractMethodProvider.canExtractMethod(
                        parseResults,
                        textRange,
                        workspace.serviceInstance.getEvaluator()
                    );
                    if (tryExtractMethodResults.failedReason === CannotExtractReason.None) {
                        const title = `Extract method`;
                        codeActions.push(
                            CodeAction.create(
                                title,
                                Command.create(title, Commands.extractMethod, filePath, range),
                                CodeActionKind.RefactorExtract
                            )
                        );
                    }

                    const tryExtractVariableResults = ExtractMethodProvider.canExtractVariable(parseResults, textRange);
                    if (tryExtractVariableResults.failedReason === CannotExtractReason.None) {
                        const title = `Extract variable`;
                        codeActions.push(
                            CodeAction.create(
                                title,
                                Command.create(title, Commands.extractVariable, filePath, range),
                                CodeActionKind.RefactorExtract
                            )
                        );
                    }
                }
            }
        }

        return codeActions;
    }
}

function addImportCompare(left: CodeAction, right: CodeAction) {
    const leftName = left.command!.arguments![2] as string;
    const rightName = right.command!.arguments![2] as string;

    const leftSource = left.command!.arguments![3] as string;
    const rightSource = right.command!.arguments![3] as string;

    if (!leftSource && !rightSource) {
        return leftName.localeCompare(rightName);
    }

    if (!leftSource && rightSource) {
        return -1;
    }

    if (leftSource && !rightSource) {
        return 1;
    }

    const leftDots = getCharacterCount(leftSource, '.');
    const rightDots = getCharacterCount(rightSource, '.');
    const comp = leftDots - rightDots;
    if (comp === 0) {
        return left.title.localeCompare(right.title);
    }

    return comp;
}
