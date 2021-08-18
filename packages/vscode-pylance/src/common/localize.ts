import { TextDecoder } from 'util';
import * as vscode from 'vscode';

import { assertDefined } from 'pyright-internal/common/debug';

import { getExtensionRoot } from './utils';

export namespace Common {
    export const yes = localize('Common.Yes', 'Yes');
    export const no = localize('Common.No', 'No');
    export const remindMeLater = localize('Common.remindMeLater', 'Remind me later');
    export const reload = localize('Common.reload', 'ReminReload');
}

export namespace LanguageServer {
    export const turnItOn = localize('LanguageServer.turnItOn', 'Yes, and reload');
    export const noThanks = localize('LanguageServer.noThanks', 'No thanks');
    export const settingsMigratedMessage = localize(
        'LanguageServer.settingsMigratedMessage',
        'Settings applicable to Microsoft Language Server were copied to Pylance settings. Please check settings.json file(s) for details.'
    );
    export const settingsMigrationError = localize(
        'LanguageServer.settingsMigrationError',
        'The following settings could not be migrated:'
    );
}

export namespace Insiders {
    export const downloadingInsiders = localize(
        'Insiders.downloadingInsiders',
        'Downloading Pylance insiders build...'
    );
    export const installingInsiders = localize('Insiders.installingInsiders', 'Installing Pylance insiders build...');
    export const installedInsiders = localize(
        'Insiders.installedInsiders',
        'Please reload Visual Studio Code to use the insiders build of Pylance.'
    );
    export const downgradeInsiders = localize(
        'Insiders.downgrade',
        'Your Pylance insiders channel is set to "off", but you still have an insiders build installed. Would you like to install the latest stable build of Pylance?'
    );
}

// Skip using vscode-nls and instead just compute our strings based on key values.
// Key values can be loaded out of the nls.<locale>.json files
let loadedCollection: Record<string, string> | undefined;
let defaultCollection: Record<string, string> | undefined;
let askedForCollection: Record<string, string> = {};
let loadedLocale: string;

const hasOwnProperty = Object.prototype.hasOwnProperty;

// This is exported only for testing purposes.
export function _resetCollections() {
    loadedLocale = '';
    loadedCollection = undefined;
    askedForCollection = {};
}

export function localize(key: string, defValue?: string) {
    // Return a pointer to function so that we refetch it on each call.
    return () => {
        return getString(key, defValue);
    };
}

// This is exported only for testing purposes.
export function _getAskedForCollection() {
    return askedForCollection;
}

declare let navigator: { language: string } | undefined;

function parseLocale(): string {
    try {
        if (navigator?.language) {
            return navigator.language.toLowerCase();
        }
    } catch {
        // Fall through
    }

    // Attempt to load from the vscode locale. If not there, use english
    const vscodeConfigString = process.env.VSCODE_NLS_CONFIG;
    return vscodeConfigString ? JSON.parse(vscodeConfigString).locale : 'en-us';
}

function getString(key: string, defValue?: string) {
    // The default collection (package.nls.json) is the fallback.
    // Note that we are guaranteed the following (during shipping)
    //  1. defaultCollection was initialized by the load() call above
    //  2. defaultCollection has the key (see the "keys exist" test)
    let collection = defaultCollection;
    assertDefined(collection);

    // Use the current locale if the key is defined there.
    if (loadedCollection && hasOwnProperty.call(loadedCollection, key)) {
        collection = loadedCollection;
    }
    let result = collection[key];
    if (!result && defValue) {
        // This can happen during development if you haven't fixed up the nls file yet or
        // if for some reason somebody broke the functional test.
        result = defValue;
    }
    askedForCollection[key] = result;

    return result;
}

// MUST be called before any user of the locale.
export async function loadLocalizedStrings() {
    // Figure out our current locale.
    loadedLocale = parseLocale();

    loadedCollection = await parseNLS(loadedLocale);
    if (!defaultCollection) {
        defaultCollection = await parseNLS();
    }
}

async function parseNLS(locale?: string) {
    try {
        const filename = locale ? `package.nls.${locale}.json` : `package.nls.json`;
        const nlsFile = vscode.Uri.joinPath(getExtensionRoot(), filename);
        const buffer = await vscode.workspace.fs.readFile(nlsFile);
        const contents = new TextDecoder().decode(buffer);
        return JSON.parse(contents);
    } catch {
        return {};
    }
}
