/*
 * quickActionCommand.ts
 * Copyright (c) Microsoft Corporation.
 *
 * Implements command that maps to a quick action.
 */

import { CancellationToken, ExecuteCommandParams } from 'vscode-languageserver';

import { LanguageServerInterface } from '..//../pyright/server/src/languageServerBase';
import { AddImportCommand } from './addImportCommand';
import { ServerCommand } from './commandController';
import { Commands } from './commands';
import { RemoveUnusedImportCommand } from './removeUnusedImportCommand';

export class QuickActionCommand implements ServerCommand {
    constructor(private _ls: LanguageServerInterface) {}

    async execute(params: ExecuteCommandParams, token: CancellationToken): Promise<any> {
        switch (params.command) {
            case Commands.removeUnusedImport: {
                const command = new RemoveUnusedImportCommand(this._ls);
                return command.execute(params, token);
            }
            case Commands.addImport: {
                const command = new AddImportCommand(this._ls);
                return command.execute(params, token);
            }
            default:
                this._ls.console.log(`unknown command: ${params.command}`);
                return [];
        }
    }
}
