/*
 * extractMethodCommand.ts
 * Copyright (c) Microsoft Corporation.
 *
 */

import { CancellationToken, ExecuteCommandParams } from 'vscode-languageserver';

import { CommandResult } from 'pyright-internal/commands/commandResult';
import { throwIfCancellationRequested } from 'pyright-internal/common/cancellationUtils';
import { convertWorkspaceEdits } from 'pyright-internal/common/workspaceEditUtils';
import { LanguageServerInterface } from 'pyright-internal/languageServerBase';

import { ExtractMethodProvider, ExtractResults } from '../languageService/refactoringProvider';
import { ServerCommand } from './commandController';

export interface ExtractCommandData {
    newSymbolName: string;
}

export class ExtractMethodCommand implements ServerCommand {
    constructor(private _ls: LanguageServerInterface) {}

    async execute(params: ExecuteCommandParams, token: CancellationToken): Promise<any> {
        throwIfCancellationRequested(token);

        if (params.arguments?.length !== 2) {
            return;
        }

        const filePath = params.arguments[0];
        const range = params.arguments[1];

        const workspace = await this._ls.getWorkspaceForFile(filePath);

        const parseResult = workspace.serviceInstance.getParseResult(filePath);
        if (!parseResult) {
            return;
        }

        const evaluator = workspace.serviceInstance.getEvaluator();
        if (!evaluator) {
            return;
        }

        const extractResults = ExtractMethodProvider.extractMethod(filePath, parseResult, range, evaluator, token);
        if (!extractResults) {
            return;
        }

        const commandResult: CommandResult = _convertToCommandResults(this._ls, extractResults);
        return commandResult;
    }
}

export class ExtractVariableCommand implements ServerCommand {
    constructor(private _ls: LanguageServerInterface) {}

    async execute(params: ExecuteCommandParams, token: CancellationToken): Promise<any> {
        throwIfCancellationRequested(token);

        if (params.arguments?.length !== 2) {
            return;
        }

        const filePath = params.arguments[0];
        const range = params.arguments[1];

        const workspace = await this._ls.getWorkspaceForFile(filePath);

        const parseResults = workspace.serviceInstance.getParseResult(filePath);
        if (!parseResults) {
            return;
        }

        const extractResults = ExtractMethodProvider.extractVariable(filePath, parseResults, range, token);
        if (!extractResults) {
            return;
        }

        const commandResult: CommandResult = _convertToCommandResults(this._ls, extractResults);
        return commandResult;
    }
}

function _convertToCommandResults(ls: LanguageServerInterface, extractResults: ExtractResults): CommandResult {
    const edits = convertWorkspaceEdits(ls.fs, extractResults.actions);

    const data: ExtractCommandData = {
        newSymbolName: extractResults.newSymbolName,
    };

    const commandResult: CommandResult = {
        data,
        edits,
    };
    return commandResult;
}
