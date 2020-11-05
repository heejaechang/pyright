/*
 * extractMethodCommand.ts
 * Copyright (c) Microsoft Corporation.
 *
 */

import { CancellationToken, ExecuteCommandParams } from 'vscode-languageserver';

import { throwIfCancellationRequested } from 'pyright-internal/common/cancellationUtils';
import { convertWorkspaceEdits } from 'pyright-internal/common/textEditUtils';
import { LanguageServerInterface } from 'pyright-internal/languageServerBase';

import { ExtractMethodProvider } from '../languageService/refactoringProvider';
import { ServerCommand } from './commandController';

export class ExtractMethodCommand implements ServerCommand {
    constructor(private _ls: LanguageServerInterface) {}

    async execute(params: ExecuteCommandParams, token: CancellationToken): Promise<any> {
        throwIfCancellationRequested(token);

        if (params.arguments?.length !== 2) {
            return [];
        }

        const filePath = params.arguments[0];
        const range = params.arguments[1];

        const workspace = await this._ls.getWorkspaceForFile(filePath);

        const parseResult = workspace.serviceInstance.getParseResult(filePath);
        if (!parseResult) {
            return [];
        }

        const evaluator = workspace.serviceInstance.getEvaluator();
        if (!evaluator) {
            return [];
        }

        const results = ExtractMethodProvider.extractMethod(filePath, parseResult, range, evaluator, token);

        return convertWorkspaceEdits(results);
    }
}
