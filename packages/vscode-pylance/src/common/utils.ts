import * as path from 'path';
import * as vscode from 'vscode';

import { AppConfiguration } from '../types/appConfig';

let extensionRoot: vscode.Uri;

export function setExtensionRoot(uri: vscode.Uri): void {
    extensionRoot = uri;
}

export function getExtensionRoot(): vscode.Uri {
    if (extensionRoot) {
        return extensionRoot;
    }
    // Possible case in tests. Use heuristics.
    const folderName = path.basename(__dirname);
    switch (folderName) {
        case 'tests':
        case 'common':
            return vscode.Uri.file(path.join(__dirname, '..', '..'));
        case 'src':
            return vscode.Uri.file(path.join(__dirname, '..'));
    }
    throw new Error('Unable to determine extension root.');
}

export const PylanceName = 'Pylance';
export const DefaultName = 'Default';
export const LanguageServerSettingName = 'languageServer';

export function isPylanceDefaultLanguageServer(appConfig: AppConfiguration): boolean {
    // This check effective setting, we don't know where it is specified yet.
    const ls = appConfig.getSetting<string>('python', LanguageServerSettingName);
    return ls === PylanceName || ls === DefaultName;
}
