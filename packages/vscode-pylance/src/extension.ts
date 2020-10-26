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
import { setExtensionRoot } from './common/utils';
import { migrateV1Settings } from './settingsMigration';
import { AppConfigurationImpl } from './types/appConfig';
import { BrowserServiceImpl } from './types/browser';
import { CommandManagerImpl } from './types/commandManager';

export async function activate(context: vscode.ExtensionContext): Promise<LSExtensionApi> {
    checkHostApp();
    const version = getExtensionVersion(context);

    setExtensionRoot(context.extensionPath);
    loadLocalizedStrings();

    const serverPath = path.join(context.extensionPath, 'dist');
    showActivatePylanceBanner(context, version).ignoreErrors();
    showPylanceSurveyBanner(context, version).ignoreErrors();
    migrateV1Settings(new AppConfigurationImpl(), new ApplicationShellImpl()).ignoreErrors();

    registerCommand(context, Commands.runCommands, (...args: vscode.Command[]) => {
        args.forEach((c) => {
            vscode.commands.executeCommand(c.command, ...(c.arguments ?? []));
        });
    });

    registerCommand(context, Commands.triggerParameterHints, (scope: string) => {
        const hintsEnabled = vscode.workspace.getConfiguration('editor.parameterHints', {
            uri: vscode.Uri.parse(scope),
            languageId: 'python',
        });

        if (hintsEnabled.get<boolean | undefined>('enabled')) {
            vscode.commands.executeCommand('editor.action.triggerParameterHints');
        }
    });

    return {
        languageServerFolder: async () => ({
            path: serverPath,
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
