import './extensions';

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { Commands } from 'pylance-internal/commands/commands';

import { LSExtensionApi } from './api';
import { ActivatePylanceBanner, PylanceSurveyBanner } from './banners';
import { ApplicationShellImpl } from './common/appShell';
import { licenseErrorText } from './common/license';
import { loadLocalizedStrings } from './common/localize';
import { PersistentStateFactoryImpl } from './common/persistentState';
import { setExtensionRoot } from './common/utils';
import { InsidersImpl } from './insiders';
import { BlobStorageImpl } from './insiders/blobStorage';
import { migrateV1Settings } from './settingsMigration';
import { AppConfigurationImpl } from './types/appConfig';
import { BrowserServiceImpl } from './types/browser';
import { Command, CommandManagerImpl } from './types/commandManager';

export async function activate(context: vscode.ExtensionContext): Promise<LSExtensionApi> {
    checkHostApp();
    setExtensionRoot(context.extensionPath);
    loadLocalizedStrings();

    const version = getExtensionVersion(context);
    const config = new AppConfigurationImpl();
    const appShell = new ApplicationShellImpl();
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

    showActivatePylanceBanner(context, version).ignoreErrors();
    showPylanceSurveyBanner(context, version).ignoreErrors();
    migrateV1Settings(config, appShell).ignoreErrors();

    insiders.onStartup().ignoreErrors();
    vscode.workspace.onDidChangeConfiguration(
        (e) => insiders.onChange(e).ignoreErrors(),
        undefined,
        context.subscriptions
    );

    registerCommand(context, Commands.runCommands, (...args: vscode.Command[]) => {
        args.forEach((c) => {
            commandManager.executeCommand(c.command as any, ...(c.arguments ?? []));
        });
    });

    registerCommand(context, Commands.triggerParameterHints, (scope: string) => {
        const hintsEnabled = vscode.workspace.getConfiguration('editor.parameterHints', {
            uri: vscode.Uri.parse(scope),
            languageId: 'python',
        });

        if (hintsEnabled.get<boolean | undefined>('enabled')) {
            commandManager.executeCommand(Command.TriggerParameterHints);
        }
    });

    return {
        languageServerFolder: async () => ({
            path: path.join(context.extensionPath, 'dist'),
            version,
        }),
    };
}

function getExtensionVersion(context: vscode.ExtensionContext): string {
    const packageJsonPath = path.join(context.extensionPath, 'package.json');
    const packageJson = fs.readFileSync(packageJsonPath, 'utf8');
    return JSON.parse(packageJson).version;
}

function checkHostApp() {
    const appName = 'Visual Studio Code';
    const insiderAppName = 'Visual Studio Code - Insiders';

    if (vscode.env.appName !== appName && vscode.env.appName !== insiderAppName) {
        throw Error(licenseErrorText);
    }
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

async function showPylanceSurveyBanner(context: vscode.ExtensionContext, version: string): Promise<void> {
    const survey = new PylanceSurveyBanner(
        new ApplicationShellImpl(),
        new BrowserServiceImpl(),
        context.globalState,
        version
    );
    return survey.show();
}

function registerCommand(
    context: vscode.ExtensionContext,
    command: string,
    callback: (...args: any[]) => any,
    thisArg?: any
) {
    context.subscriptions.push(vscode.commands.registerCommand(command, callback, thisArg));
}
