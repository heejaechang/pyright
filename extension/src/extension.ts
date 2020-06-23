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
