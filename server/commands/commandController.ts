/*
 * commandController.ts
 *
 * Implements language server commands execution functionality.
 */

import { ExecuteCommandParams, CancellationToken } from 'vscode-languageserver';
import { CommandController as PyrightCommandController } from '../pyright/server/src/commands/commandController';
import { Commands as PyrightCommands } from '../pyright/server/src/commands/commands';
import { LanguageServerInterface } from '../pyright/server/src/languageServerBase';
import { Commands } from './commands';

export interface ServerCommand {
    execute(cmdParams: ExecuteCommandParams, token: CancellationToken): Promise<any>;
}

export class CommandController extends PyrightCommandController {
    constructor(_ls: LanguageServerInterface) {
        super(_ls);
    }

    async execute(cmdParams: ExecuteCommandParams, token: CancellationToken): Promise<any> {
        let pyrightCommand: PyrightCommands | undefined;

        switch (cmdParams.command) {
            case Commands.createTypeStub:
                pyrightCommand = PyrightCommands.createTypeStub;
                break;
            case Commands.orderImports:
                pyrightCommand = PyrightCommands.orderImports;
                break;
            case Commands.addMissingOptionalToParam:
                pyrightCommand = PyrightCommands.addMissingOptionalToParam;
                break;
        }

        cmdParams.command = pyrightCommand || cmdParams.command;
        return super.execute(cmdParams, token);
    }
}
