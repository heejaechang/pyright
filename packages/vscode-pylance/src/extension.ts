import './extensions';

import * as path from 'path';
import * as vscode from 'vscode';
import { commands, Range } from 'vscode';

import { CommandResult } from 'pyright-internal/commands/commandResult';

import { ClientCommands, Commands } from 'pylance-internal/commands/commands';

import { LSExtensionApi } from './api';
import { registerAutoClosing } from './autoClosing';
import { ActivatePylanceBanner } from './banners';
import { addToExtraPaths } from './commands/addToExtraPaths';
import { renameEdit } from './commands/extractRename';
import reportIssue from './commands/reportIssue';
import { ApplicationShellImpl } from './common/appShell';
import { licenseErrorText } from './common/license';
import { loadLocalizedStrings } from './common/localize';
import { PersistentStateFactoryImpl } from './common/persistentState';
import { PylanceName, setExtensionRoot } from './common/utils';
import { InsidersImpl } from './insiders';
import { BlobStorageImpl } from './insiders/blobStorage';
import { migrateV1Settings } from './settingsMigration';
import { AppConfigurationImpl } from './types/appConfig';
import { BrowserServiceImpl } from './types/browser';
import { CommandManager, CommandManagerImpl, EditorCommand } from './types/commandManager';

export async function activate(context: vscode.ExtensionContext): Promise<LSExtensionApi> {
    const appShell = new ApplicationShellImpl();
    if (!checkHostApp()) {
        const outputChannel = appShell.createOutputChannel(PylanceName);
        outputChannel.appendLine(licenseErrorText);
        return {};
    }
    setExtensionRoot(context.extensionPath);
    loadLocalizedStrings();

    const version = getExtensionVersion();
    const config = new AppConfigurationImpl();
    const persistentState = new PersistentStateFactoryImpl(context.globalState, context.workspaceState);
    const blobStorage = new BlobStorageImpl();
    const commandManager = new CommandManagerImpl();
    const insiders = new InsidersImpl(
        version,
        context.extensionPath,
        config,
        appShell,
        persistentState,
        blobStorage,
        commandManager
    );
    const browser = new BrowserServiceImpl();

    showActivatePylanceBanner(context, version).ignoreErrors();

    migrateV1Settings(config, appShell).ignoreErrors();

    insiders.onStartup().ignoreErrors();
    vscode.workspace.onDidChangeConfiguration(
        (e) => insiders.onChange(e).ignoreErrors(),
        undefined,
        context.subscriptions
    );

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
        (filePath: string, range: Range) => {
            commands.executeCommand<CommandResult>(Commands.extractMethod, filePath, range).then((extractResult) => {
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
        (filePath: string, range: Range) => {
            commands.executeCommand<CommandResult>(Commands.extractVariable, filePath, range).then((extractResult) => {
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
        addToExtraPaths(config, filePath, toAdd);
    });

    registerAutoClosing();

    return {
        languageServerFolder: async () => ({
            path: path.join(context.extensionPath, 'dist'),
            version,
        }),
    };
}

function getExtensionVersion(): string {
    const ext = vscode.extensions.getExtension('ms-python.vscode-pylance');
    return ext?.packageJSON.version ?? '9999.0.0-dev';
}

function checkHostApp(): boolean {
    const appName = 'Visual Studio Code';
    const insiderAppName = 'Visual Studio Code - Insiders';

    return vscode.env.appName === appName || vscode.env.appName === insiderAppName;
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate() {}

async function showActivatePylanceBanner(context: vscode.ExtensionContext, version: string): Promise<void> {
    const switchToPylance = new ActivatePylanceBanner(
        new ApplicationShellImpl(),
        new AppConfigurationImpl(),
        new CommandManagerImpl(),
        context.globalState,
        version
    );
    return switchToPylance.show();
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
