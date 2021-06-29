/*
 * codeActionProvider.ts
 * Copyright (c) Microsoft Corporation.
 *
 * Handles 'code actions' requests from the client.
 */

import { CancellationToken, CodeAction, CodeActionKind, Command } from 'vscode-languageserver';

import { Commands as PyrightCommands } from 'pyright-internal/commands/commands';
import { throwIfCancellationRequested } from 'pyright-internal/common/cancellationUtils';
import { Diagnostic, DiagnosticCategory } from 'pyright-internal/common/diagnostic';
import { DiagnosticRule } from 'pyright-internal/common/diagnosticRules';
import { getRelativePath, normalizeSlashes } from 'pyright-internal/common/pathUtils';
import { convertRangeToTextRange } from 'pyright-internal/common/positionUtils';
import { getCharacterCount } from 'pyright-internal/common/stringUtils';
import { Range } from 'pyright-internal/common/textRange';
import { getAutoImportText } from 'pyright-internal/languageService/tooltipUtils';

import { PylanceWorkspaceServiceInstance } from '../../src/server';
import { ClientCommands, Commands } from '../commands/commands';
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
                                Command.create(title, ClientCommands.extractMethodWithRename, filePath, range),
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
                                Command.create(title, ClientCommands.extractVariableWithRename, filePath, range),
                                CodeActionKind.RefactorExtract
                            )
                        );
                    }
                }
            }
        }

        addExtraPathCodeActions(workspace, filePath, diags, codeActions);

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

function addExtraPathCodeActions(
    workspace: PylanceWorkspaceServiceInstance,
    filePath: string,
    diags: Diagnostic[],
    codeActions: CodeAction[]
) {
    if (!workspace.rootPath) {
        // No root, so extraPaths wouldn't work.
        return;
    }

    // Only consider fully missing imports; "reportMissingModuleSource" isn't fixable via extraPaths.
    const unresolvedImportDiags = diags.filter((d) => d.getRule() === DiagnosticRule.reportMissingImports);

    if (unresolvedImportDiags.length === 0) {
        return;
    }

    const parseResults = workspace.serviceInstance.getParseResult(filePath);
    if (!parseResults) {
        return;
    }

    const diagRange = unresolvedImportDiags[0].range;
    const textRange = convertRangeToTextRange(diagRange, parseResults.tokenizerOutput.lines);
    if (!textRange) {
        return;
    }

    const moduleName = parseResults.text.slice(textRange.start, textRange.start + textRange.length);

    if (moduleName[0] === '.' || moduleName.includes('__')) {
        // Ignore relative imports and bad imports like __init__.
        return;
    }

    const modulePath = moduleName.split('.').join('/');

    const potentialSuffixes = [
        `/${modulePath}.py`,
        `/${modulePath}.pyi`,
        `/${modulePath}/__init__.py`,
        `/${modulePath}/__init__.pyi`,
    ].map(normalizeSlashes);

    const candidates: string[] = [];

    const trackedFiles = workspace.serviceInstance.backgroundAnalysisProgram.program.getTracked();
    for (const f of trackedFiles) {
        const filePath = f.sourceFile.getFilePath();

        for (const suffix of potentialSuffixes) {
            if (filePath.endsWith(suffix)) {
                const withoutSuffix = filePath.slice(0, -suffix.length);
                const relativeToRoot = getRelativePath(withoutSuffix, workspace.rootPath);
                if (!relativeToRoot) {
                    continue;
                }

                // Use forward slashes, which works cross-platform and matches our troubleshooting.
                candidates.push(relativeToRoot.replace(/\\/g, '/'));
            }
        }
    }

    candidates.sort((a, b) => a.length - b.length);

    for (const c of candidates) {
        const title = `Add "${c}" to extraPaths`;
        codeActions.push(
            CodeAction.create(
                title,
                Command.create(title, ClientCommands.addToExtraPaths, filePath, c),
                CodeActionKind.QuickFix
            )
        );
    }
}
