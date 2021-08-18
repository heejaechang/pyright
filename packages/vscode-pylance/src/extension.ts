import './extensions';

import * as path from 'path';
import * as vscode from 'vscode';

import { LSExtensionApi } from './api';
import { ApplicationShellImpl } from './common/appShell';
import { licenseErrorText } from './common/license';
import { PersistentStateFactoryImpl } from './common/persistentState';
import { PylanceName } from './common/utils';
import { InsidersImpl } from './insiders';
import { BlobStorageImpl } from './insiders/blobStorage';
import { migrateV1Settings } from './settingsMigration';
import { activateShared } from './sharedExtension';

export async function activate(context: vscode.ExtensionContext): Promise<LSExtensionApi> {
    const { version, config, commandManager } = await activateShared(context);

    const appShell = new ApplicationShellImpl();
    if (!checkHostApp()) {
        const outputChannel = appShell.createOutputChannel(PylanceName);
        outputChannel.appendLine(licenseErrorText);
        return {};
    }

    const persistentState = new PersistentStateFactoryImpl(context.globalState, context.workspaceState);
    const blobStorage = new BlobStorageImpl();
    const insiders = new InsidersImpl(
        version,
        context.extensionPath,
        config,
        appShell,
        persistentState,
        blobStorage,
        commandManager
    );

    migrateV1Settings(config, appShell).ignoreErrors();

    insiders.onStartup().ignoreErrors();
    vscode.workspace.onDidChangeConfiguration(
        (e) => insiders.onChange(e).ignoreErrors(),
        undefined,
        context.subscriptions
    );

    return {
        languageServerFolder: async () => ({
            path: path.join(context.extensionPath, 'dist'),
            version,
        }),
    };
}

function checkHostApp(): boolean {
    const appName = 'Visual Studio Code';
    const insiderAppName = 'Visual Studio Code - Insiders';

    return vscode.env.appName === appName || vscode.env.appName === insiderAppName;
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate() {}
