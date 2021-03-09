/*
 * removeUnusedImportCommand.ts
 * Copyright (c) Microsoft Corporation.
 *
 * Implements remove unused import command
 */

import { CancellationToken, ExecuteCommandParams } from 'vscode-languageserver';

import { getAllImportNames, getContainingImportStatement } from 'pyright-internal/analyzer/importStatementUtils';
import * as ParseTreeUtils from 'pyright-internal/analyzer/parseTreeUtils';
import { Commands as PyrightCommands } from 'pyright-internal/commands/commands';
import { throwIfCancellationRequested } from 'pyright-internal/common/cancellationUtils';
import { DiagnosticCategory } from 'pyright-internal/common/diagnostic';
import { convertOffsetsToRange } from 'pyright-internal/common/positionUtils';
import { doRangesIntersect, doRangesOverlap, Range, TextRange } from 'pyright-internal/common/textRange';
import { TextRangeCollection } from 'pyright-internal/common/textRangeCollection';
import { convertWorkspaceEdits } from 'pyright-internal/common/workspaceEditUtils';
import { LanguageServerInterface } from 'pyright-internal/languageServerBase';

import { ServerCommand } from './commandController';

export class RemoveUnusedImportCommand implements ServerCommand {
    constructor(private _ls: LanguageServerInterface) {}

    async execute(params: ExecuteCommandParams, token: CancellationToken): Promise<any> {
        throwIfCancellationRequested(token);

        if (params.arguments?.length !== 2) {
            return [];
        }

        const filePath = params.arguments[0];
        const range = params.arguments[1];
        const workspace = await this._ls.getWorkspaceForFile(filePath);

        const diagnostics = await workspace.serviceInstance.getDiagnosticsForRange(filePath, range, token);
        if (
            diagnostics.filter(
                (d) =>
                    d.category === DiagnosticCategory.UnusedCode &&
                    d.getActions()?.some((a) => a.action === PyrightCommands.unusedImport)
            ).length === 0
        ) {
            return [];
        }

        const parseResult = workspace.serviceInstance.getParseResult(filePath);
        if (!parseResult) {
            return [];
        }

        const importNode = getContainingImportStatement(
            ParseTreeUtils.findNodeByPosition(parseResult.parseTree, range.start, parseResult.tokenizerOutput.lines),
            token
        );

        if (!importNode) {
            return [];
        }

        const lines = parseResult.tokenizerOutput.lines;
        const importRange = convertOffsetsToRange(importNode.start, TextRange.getEnd(importNode), lines);
        const unusedImports = (
            await workspace.serviceInstance.getDiagnosticsForRange(filePath, importRange, token)
        ).filter(
            (d) =>
                d.category === DiagnosticCategory.UnusedCode &&
                d.getActions()?.some((a) => a.action === PyrightCommands.unusedImport)
        );

        const nameNodes = getAllImportNames(importNode);

        // check various different cases
        // 1. check whether all imported names in the import statement is not used.
        let nameLeft = nameNodes.length;
        for (const name of nameNodes) {
            if (
                unusedImports.filter((d) =>
                    doRangesOverlap(convertOffsetsToRange(name.start, TextRange.getEnd(name), lines), d.range)
                ).length !== 0
            ) {
                nameLeft--;
            }
        }

        if (nameLeft === 0) {
            return convertWorkspaceEdits(this._ls.fs, [
                { filePath: filePath, range: this._adjustRange(importRange, lines), replacementText: '' },
            ]);
        }

        // 2. some of modules in the import statement is used.
        const index = nameNodes.findIndex((n: TextRange) =>
            doRangesIntersect(convertOffsetsToRange(n.start, TextRange.getEnd(n), lines), range)
        );

        if (index < 0) {
            // can't find module user wants to remove
            return [];
        }

        let editSpan: TextRange;
        if (index === nameNodes.length - 1) {
            // get span of "import A[|, B|]"
            const start = TextRange.getEnd(nameNodes[index - 1]);
            const length = TextRange.getEnd(nameNodes[index]) - start;
            editSpan = { start, length };
        } else {
            // get span of "import [|A, |]B"
            const start = nameNodes[index].start;
            const length = nameNodes[index + 1].start - start;
            editSpan = { start, length };
        }

        return convertWorkspaceEdits(this._ls.fs, [
            {
                filePath,
                range: convertOffsetsToRange(editSpan.start, TextRange.getEnd(editSpan), lines),
                replacementText: '',
            },
        ]);
    }

    private _adjustRange(range: Range, lines: TextRangeCollection<TextRange>): Range {
        if (range.end.line === lines.count - 1) {
            return range;
        }

        return { start: range.start, end: { line: range.end.line + 1, character: 0 } };
    }
}
