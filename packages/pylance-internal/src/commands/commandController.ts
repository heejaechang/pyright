/*
 * commandController.ts
 *
 * Implements language server commands execution functionality.
 */

import { CancellationToken, ExecuteCommandParams, TextEdit } from 'vscode-languageserver';

import { CommandController as PyrightCommandController } from 'pyright-internal/commands/commandController';
import { Commands as PyrightCommands } from 'pyright-internal/commands/commands';
import { convertUriToPath } from 'pyright-internal/common/pathUtils';
import { convertWorkspaceEdits } from 'pyright-internal/common/workspaceEditUtils';
import { LanguageServerInterface } from 'pyright-internal/languageServerBase';

import { TelemetryEvent, TelemetryEventName, TelemetryService } from '../common/telemetry';
import { Commands } from './commands';
import { CompletionAcceptedCommand } from './completionAcceptedCommand';
import { DumpFileDebugInfoCommand } from './dumpFileDebugInfoCommand';
import { ExtractMethodCommand } from './extractMethodCommand';
import { ExtractVariableCommand } from './extractVariableCommand';
import { QuickActionCommand } from './quickActionCommand';

export interface ServerCommand {
    execute(cmdParams: ExecuteCommandParams, token: CancellationToken): Promise<any>;
}

const _userInitiatedTelemetryCommands: Set<string> = new Set([
    PyrightCommands.createTypeStub,
    PyrightCommands.orderImports,
    PyrightCommands.addMissingOptionalToParam,
    Commands.createTypeStub,
    Commands.orderImports,
    Commands.addMissingOptionalToParam,
    Commands.removeUnusedImport,
    Commands.addImport,
    Commands.extractMethod,
    Commands.extractVariable,
]);

export class CommandController extends PyrightCommandController {
    private _pylanceQuickAction: QuickActionCommand;
    private _extractMethod: ExtractMethodCommand;
    private _extractVariable: ExtractVariableCommand;
    private _dumpFileDebugInfo: DumpFileDebugInfoCommand;
    private _completionAccepted: CompletionAcceptedCommand;

    private _pyrightCommandMap = new Map<string, string>([
        [Commands.createTypeStub, PyrightCommands.createTypeStub],
        [Commands.orderImports, PyrightCommands.orderImports],
        [Commands.addMissingOptionalToParam, PyrightCommands.addMissingOptionalToParam],
        [PyrightCommands.createTypeStub, PyrightCommands.createTypeStub],
        [PyrightCommands.orderImports, PyrightCommands.orderImports],
        [PyrightCommands.addMissingOptionalToParam, PyrightCommands.addMissingOptionalToParam],
    ]);

    constructor(private _ls: LanguageServerInterface, private _telemetry: TelemetryService | undefined) {
        super(_ls);

        this._pylanceQuickAction = new QuickActionCommand(_ls);
        this._extractMethod = new ExtractMethodCommand(_ls);
        this._extractVariable = new ExtractVariableCommand(_ls);
        this._dumpFileDebugInfo = new DumpFileDebugInfoCommand(_ls);
        this._completionAccepted = new CompletionAcceptedCommand(_telemetry);
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
            Commands.extractMethod,
            Commands.extractVariable,
            Commands.dumpFileDebugInfo,
            Commands.completionAccepted,
        ];
    }

    async execute(cmdParams: ExecuteCommandParams, token: CancellationToken): Promise<any> {
        this._sendUserInitiatedCommandTelemetry(cmdParams);

        switch (cmdParams.command) {
            case Commands.removeUnusedImport:
            case Commands.addImport:
                return await this._pylanceQuickAction.execute(cmdParams, token);
            case Commands.extractMethod:
                return await this._extractMethod.execute(cmdParams, token);
            case Commands.extractVariable:
                return await this._extractVariable.execute(cmdParams, token);
            case Commands.dumpFileDebugInfo:
                return await this._dumpFileDebugInfo.execute(cmdParams, token);
            case Commands.completionAccepted:
                return await this._completionAccepted.execute(cmdParams, token);
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
            const filePath = convertUriToPath(this._ls.fs, docUri);
            const edits = result as TextEdit[];

            // return workspace edits so that we can handle it
            // without support from client
            return convertWorkspaceEdits(
                this._ls.fs,
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

    private _sendUserInitiatedCommandTelemetry(cmdParams: ExecuteCommandParams) {
        if (this._telemetry && _userInitiatedTelemetryCommands.has(cmdParams.command)) {
            const te = new TelemetryEvent(TelemetryEventName.EXECUTE_COMMAND);
            te.Properties['name'] = cmdParams.command;
            this._telemetry.sendTelemetry(te);
        }
    }
}
