import * as vscode from 'vscode';

import { LSExtensionApi } from './api';
import { activateShared } from './sharedExtension';

export async function activate(context: vscode.ExtensionContext): Promise<LSExtensionApi> {
    const { version } = await activateShared(context);

    return {
        languageServerFolder: async () => ({
            path: vscode.Uri.joinPath(context.extensionUri, 'dist').toString(),
            version,
        }),
    };
}
