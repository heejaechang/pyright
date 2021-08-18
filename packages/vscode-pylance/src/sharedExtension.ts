import './extensions';

import * as vscode from 'vscode';

import { CommandResult } from 'pyright-internal/commands/commandResult';

import { ClientCommands, Commands } from 'pylance-internal/commands/commands';

import { registerAutoClosing } from './autoClosing';
import { addToExtraPaths } from './commands/addToExtraPaths';
import { renameEdit } from './commands/extractRename';
import reportIssue from './commands/reportIssue';
import { loadLocalizedStrings } from './common/localize';
import { setExtensionRoot } from './common/utils';
import { AppConfigurationImpl } from './types/appConfig';
import { BrowserServiceImpl } from './types/browser';
import { CommandManager, CommandManagerImpl, EditorCommand } from './types/commandManager';

export async function activateShared(context: vscode.ExtensionContext) {
    setExtensionRoot(context.extensionUri);
    await loadLocalizedStrings();

    const version = getExtensionVersion();
    const config = new AppConfigurationImpl();
    const commandManager = new CommandManagerImpl();
    const browser = new BrowserServiceImpl();

    registerCommand(context, commandManager, ClientCommands.runCommands, (...args: vscode.Command[]) => {
        args.forEach((c) => {
            commandManager.executeCommand(c.command as any, ...(c.arguments ?? []));
        });
    });

    registerCommand(context, commandManager, ClientCommands.triggerParameterHints, (scope: string) => {
        const hintsEnabled = vscode.workspace.getConfiguration('editor.parameterHints', {
            uri: vscode.Uri.parse(scope),
            languageId: 'python',
        });

        if (hintsEnabled.get<boolean | undefined>('enabled')) {
            commandManager.executeCommand(EditorCommand.TriggerParameterHints);
        }
    });

    registerCommand(
        context,
        commandManager,
        ClientCommands.extractMethodWithRename,
        (filePath: string, range: vscode.Range) => {
            vscode.commands
                .executeCommand<CommandResult>(Commands.extractMethod, filePath, range)
                .then((extractResult) => {
                    if (extractResult) {
                        renameEdit(extractResult);
                    }
                });
        }
    );

    registerCommand(
        context,
        commandManager,
        ClientCommands.extractVariableWithRename,
        (filePath: string, range: vscode.Range) => {
            vscode.commands
                .executeCommand<CommandResult>(Commands.extractVariable, filePath, range)
                .then((extractResult) => {
                    if (extractResult) {
                        renameEdit(extractResult);
                    }
                });
        }
    );

    registerCommand(context, commandManager, ClientCommands.reportIssue, () => {
        reportIssue(browser, version);
    });

    registerCommand(context, commandManager, ClientCommands.addToExtraPaths, (filePath: string, toAdd: string) => {
        addToExtraPaths(config, commandManager, filePath, toAdd);
    });

    registerAutoClosing();

    return {
        version,
        config,
        commandManager,
    };
}

function getExtensionVersion(): string {
    const ext = vscode.extensions.getExtension('ms-python.vscode-pylance');
    return ext?.packageJSON.version ?? '9999.0.0-dev';
}

function registerCommand(
    context: vscode.ExtensionContext,
    commandManager: CommandManager,
    command: ClientCommands,
    callback: (...args: any[]) => any,
    thisArg?: any
) {
    context.subscriptions.push(commandManager.registerCommand(command, callback, thisArg));
}
