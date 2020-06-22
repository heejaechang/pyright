import * as path from 'path';
import * as vscode from 'vscode';

import { LSExtensionApi } from './api';

export async function activate(context: vscode.ExtensionContext): Promise<LSExtensionApi> {
    const serverPath = path.join(context.extensionPath, 'server');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const version = require('../package.json').version; // TODO: Get version from somewhere else?

    return {
        languageServerFolder: async () => ({
            path: serverPath,
            version,
        }),
    };
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate() {}
