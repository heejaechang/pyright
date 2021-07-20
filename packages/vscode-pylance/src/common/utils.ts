import * as path from 'path';

import { AppConfiguration } from '../types/appConfig';

let extensionRootFolder: string;

export function setExtensionRoot(extensionRoot: string): void {
    extensionRootFolder = extensionRoot;
}

export function getExtensionRoot(): string {
    if (extensionRootFolder) {
        return extensionRootFolder;
    }
    // Possible case in tests. Use heuristics.
    const folderName = path.basename(__dirname);
    switch (folderName) {
        case 'tests':
        case 'common':
            return path.join(__dirname, '..', '..');
        case 'src':
            return path.join(__dirname, '..');
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

export function hasDefaultLanguageServer(appConfig: AppConfiguration): boolean {
    const setting = appConfig.inspect('python', LanguageServerSettingName);
    return setting?.defaultValue === DefaultName;
}
