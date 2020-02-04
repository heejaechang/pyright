/*
 * commandController.ts
 *
 * Implements language server commands execution functionality.
 */

import { ExecuteCommandParams } from 'vscode-languageserver';
import { CommandController as PyrightCommandController } from '../pyright/server/src/commands/commandController';
import { CommandId as PyrightCommandId } from '../pyright/server/src/commands/commands';
import { LanguageServerBase } from '../pyright/server/src/languageServerBase';
import { CommandId } from './commands';

export interface ServerCommand {
    execute(cmdParams: ExecuteCommandParams): Promise<any>;
}

export class CommandController extends PyrightCommandController {
    constructor(_ls: LanguageServerBase) {
        super(_ls);
    }

    async execute(cmdParams: ExecuteCommandParams): Promise<any> {
        let translatedId: PyrightCommandId | undefined;

        switch (cmdParams.command) {
            case CommandId.createTypeStub:
                translatedId = PyrightCommandId.createTypeStub;
                break;
            case CommandId.orderImports:
                translatedId = PyrightCommandId.orderImports;
                break;
            case CommandId.addMissingOptionalToParam:
                translatedId = PyrightCommandId.addMissingOptionalToParam;
                break;
        }

        cmdParams.command = translatedId || cmdParams.command;
        return super.execute(cmdParams);
    }
}
