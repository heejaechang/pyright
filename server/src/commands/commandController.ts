/*
 * commandController.ts
 *
 * Implements language server commands execution functionality.
 */

import { CancellationToken, ExecuteCommandParams, TextEdit } from 'vscode-languageserver';

import { CommandController as PyrightCommandController } from '../../pyright/server/src/commands/commandController';
import { Commands as PyrightCommands } from '../../pyright/server/src/commands/commands';
import { convertUriToPath } from '../../pyright/server/src/common/pathUtils';
import { convertWorkspaceEdits } from '../../pyright/server/src/common/textEditUtils';
import { LanguageServerInterface } from '../../pyright/server/src/languageServerBase';
import { Commands } from './commands';
import { QuickActionCommand } from './quickActionCommand';

export interface ServerCommand {
    execute(cmdParams: ExecuteCommandParams, token: CancellationToken): Promise<any>;
}

export class CommandController extends PyrightCommandController {
    private _pylanceQuickAction: QuickActionCommand;
    private _pyrightCommandMap = new Map<string, string>([
        [Commands.createTypeStub, PyrightCommands.createTypeStub],
        [Commands.orderImports, PyrightCommands.orderImports],
        [Commands.addMissingOptionalToParam, PyrightCommands.addMissingOptionalToParam],
        [PyrightCommands.createTypeStub, PyrightCommands.createTypeStub],
        [PyrightCommands.orderImports, PyrightCommands.orderImports],
        [PyrightCommands.addMissingOptionalToParam, PyrightCommands.addMissingOptionalToParam],
    ]);

    constructor(ls: LanguageServerInterface) {
        super(ls);

        this._pylanceQuickAction = new QuickActionCommand(ls);
    }

    static supportedCommands() {
        return [
            PyrightCommands.createTypeStub,
            PyrightCommands.orderImports,
            PyrightCommands.addMissingOptionalToParam,
            Commands.createTypeStub,
            Commands.orderImports,
            Commands.addMissingOptionalToParam,
            Commands.removeUnusedImport,
            Commands.addImport,
            Commands.intelliCodeCompletionItemCommand,
            Commands.intelliCodeLoadExtension,
        ];
    }

    async execute(cmdParams: ExecuteCommandParams, token: CancellationToken): Promise<any> {
        switch (cmdParams.command) {
            case Commands.removeUnusedImport:
            case Commands.addImport:
                return await this._pylanceQuickAction.execute(cmdParams, token);
        }

        const pyrightCommand = this._pyrightCommandMap.get(cmdParams.command);
        if (!pyrightCommand) {
            return;
        }

        cmdParams.command = pyrightCommand;
        const result = await super.execute(cmdParams, token);

        // handle pyright quick action command
        if (
            Array.isArray(result) &&
            result.length > 0 &&
            TextEdit.is(result[0]) &&
            cmdParams.arguments &&
            cmdParams.arguments.length >= 1
        ) {
            const docUri = cmdParams.arguments[0];
            const filePath = convertUriToPath(docUri);
            const edits = result as TextEdit[];

            // return workspace edits so that we can handle it
            // without support from client
            return convertWorkspaceEdits(
                edits.map((e) => {
                    return {
                        filePath,
                        range: e.range,
                        replacementText: e.newText,
                    };
                })
            );
        }

        return result;
    }
}
