import './extensions';

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { LSExtensionApi } from './api';
import { ActivatePylanceBanner, PylanceSurveyBanner } from './banners';
import { ApplicationShellImpl } from './common/appShell';
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

    const serverPath = path.join(context.extensionPath, 'server');
    showActivatePylanceBanner(context, version).ignoreErrors();
    showPylanceSurveyBanner(context, version).ignoreErrors();
    migrateV1Settings(new AppConfigurationImpl(), new ApplicationShellImpl()).ignoreErrors();

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
        const licenseErrorText = [
            'You may only use the Pylance extension with Visual Studio Code, Visual Studio or Xamarin Studio software',
            'to help you develop and test your applications.',
            'The software is licensed, not sold.',
            'This agreement only gives you some rights to use the software.',
            'Microsoft reserves all other rights',
            'You may not work around any technical limitations in the software;',
            'reverse engineer, decompile or disassemble the software',
            'remove, minimize, block or modify any notices of Microsoft or ',
            'its suppliers in the software share, publish, rent, or lease ',
            'the software, or provide the software as a stand-alone hosted as solution for others to use.',
        ].join('\n');

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
