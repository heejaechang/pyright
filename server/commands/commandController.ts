/*
 * commandController.ts
 *
 * Implements language server commands execution functionality.
 */

import { ExecuteCommandParams } from 'vscode-languageserver';
import { CommandController as PyrightCommandController } from '../pyright/server/src/commands/commandController';
import { Commands as PyrightCommands } from '../pyright/server/src/commands/commands';
import { LanguageServerBase } from '../pyright/server/src/languageServerBase';
import { Commands } from './commands';

export interface ServerCommand {
    execute(cmdParams: ExecuteCommandParams): Promise<any>;
}

export class CommandController extends PyrightCommandController {
    constructor(_ls: LanguageServerBase) {
        super(_ls);
    }

    async execute(cmdParams: ExecuteCommandParams): Promise<any> {
        let translatedId: PyrightCommands | undefined;

        switch (cmdParams.command) {
            case Commands.createTypeStub:
                translatedId = PyrightCommands.createTypeStub;
                break;
            case Commands.orderImports:
                translatedId = PyrightCommands.orderImports;
                break;
            case Commands.addMissingOptionalToParam:
                translatedId = PyrightCommands.addMissingOptionalToParam;
                break;
        }

        cmdParams.command = translatedId || cmdParams.command;
        return super.execute(cmdParams);
    }
}
