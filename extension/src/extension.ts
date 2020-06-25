import * as path from 'path';
import * as vscode from 'vscode';

import { LSExtensionApi } from './api';
import { ActivatePylanceBanner } from './banners';
import { ApplicationShellImpl } from './common/appShell';
import { loadLocalizedStrings } from './common/localize';
import { setExtensionRoot } from './common/utils';
import { AppConfigurationImpl } from './types/appConfig';
import { CommandManagerImpl } from './types/commandManager';

export async function activate(context: vscode.ExtensionContext): Promise<LSExtensionApi> {
    checkHostApp();

    setExtensionRoot(context.extensionPath);
    loadLocalizedStrings();

    const serverPath = path.join(context.extensionPath, 'server');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const version = require('../package.json').version; // TODO: Get version from somewhere else?

    await showActivatePylanceBanner(context);
    return {
        languageServerFolder: async () => ({
            path: serverPath,
            version,
        }),
    };
}

function checkHostApp() {
    const appName = 'Visual Studio Code';

    if (vscode.env.appName !== appName) {
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

async function showActivatePylanceBanner(context: vscode.ExtensionContext): Promise<void> {
    const switchToPylance = new ActivatePylanceBanner(
        new ApplicationShellImpl(),
        new AppConfigurationImpl(),
        new CommandManagerImpl(),
        context.globalState
    );
    return switchToPylance.showBanner();
}
