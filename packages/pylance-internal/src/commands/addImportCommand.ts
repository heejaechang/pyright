/*
 * removeUnusedImportCommand.ts
 * Copyright (c) Microsoft Corporation.
 *
 * Implements remove unused import command
 */

import { CancellationToken, ExecuteCommandParams } from 'vscode-languageserver';

import { throwIfCancellationRequested } from 'pyright-internal/common/cancellationUtils';
import { convertWorkspaceEdits } from 'pyright-internal/common/workspaceEditUtils';
import { LanguageServerInterface } from 'pyright-internal/languageServerBase';

import { addImportSimilarityLimit, wellKnownAbbreviationMap } from '../common/importUtils';
import { ServerCommand } from './commandController';

export class AddImportCommand implements ServerCommand {
    constructor(private _ls: LanguageServerInterface) {}

    async execute(params: ExecuteCommandParams, token: CancellationToken): Promise<any> {
        throwIfCancellationRequested(token);

        if (params.arguments?.length !== 4) {
            return [];
        }

        const filePath = params.arguments[0];
        const range = params.arguments[1];
        const name = params.arguments[2];

        // Normalize null to undefined
        const source = params.arguments[3] ?? undefined;

        const workspace = await this._ls.getWorkspaceForFile(filePath);
        const autoImports = workspace.serviceInstance.getAutoImports(
            filePath,
            range,
            addImportSimilarityLimit,
            wellKnownAbbreviationMap,
            /* lazyEdit */ false,
            token
        );

        const result = autoImports.find((r) => r.name === name && r.source === source);
        if (!result) {
            return [];
        }

        // Add the import and replace the text where diagnostic is on to the auto import name
        // for fuzzy matching case
        return convertWorkspaceEdits(this._ls.fs, [
            ...result.edits!.map((e) => {
                return { filePath, range: e.range, replacementText: e.replacementText };
            }),
            { filePath, range, replacementText: result.insertionText },
        ]);
    }
}
