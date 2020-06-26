import * as fs from 'fs';
import * as path from 'path';

import { getExtensionRoot } from './utils';

export namespace Common {
    export const yes = localize('Common.Yes', 'Yes');
    export const no = localize('Common.No', 'No');
    export const remindMeLater = localize('Common.remindMeLater', 'Remind me later');
}

export namespace LanguageServer {
    export const installedButInactive = localize(
        'LanguageServer.installedButInactive',
        'Would you like to make Pylance your default language server for Python?'
    );
    export const turnItOn = localize('LanguageServer.turnItOn', 'Yes, and reload');
    export const noThanks = localize('LanguageServer.noThanks', 'No thanks');
    export const surveyMessage = localize(
        'LanguageServer.surveyMessage',
        'Can you please take 2 minutes to tell us how Pylance language server is working for you?'
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

// Return the effective set of all localization strings, by key.
// This should not be used for direct lookup.
export function getCollectionJSON(): string {
    // Load the current collection
    if (!loadedCollection || parseLocale() !== loadedLocale) {
        loadLocalizedStrings();
    }

    // Combine the default and loaded collections
    return JSON.stringify({ ...defaultCollection, ...loadedCollection });
}

// This is exported only for testing purposes.
export function _getAskedForCollection() {
    return askedForCollection;
}

function parseLocale(): string {
    // Attempt to load from the vscode locale. If not there, use english
    const vscodeConfigString = process.env.VSCODE_NLS_CONFIG;
    return vscodeConfigString ? JSON.parse(vscodeConfigString).locale : 'en-us';
}

function getString(key: string, defValue?: string) {
    // Load the current collection
    if (!loadedCollection || parseLocale() !== loadedLocale) {
        loadLocalizedStrings();
    }

    // The default collection (package.nls.json) is the fallback.
    // Note that we are guaranteed the following (during shipping)
    //  1. defaultCollection was initialized by the load() call above
    //  2. defaultCollection has the key (see the "keys exist" test)
    let collection = defaultCollection!;

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

export function loadLocalizedStrings() {
    // Figure out our current locale.
    loadedLocale = parseLocale();

    // Find the nls file that matches (if there is one)
    const nlsFile = path.join(getExtensionRoot(), `package.nls.${loadedLocale}.json`);
    if (fs.existsSync(nlsFile)) {
        const contents = fs.readFileSync(nlsFile, 'utf8');
        loadedCollection = JSON.parse(contents);
    } else {
        // If there isn't one, at least remember that we looked so we don't try to load a second time
        loadedCollection = {};
    }

    // Get the default collection if necessary. Strings may be in the default or the locale json
    if (!defaultCollection) {
        const defaultNlsFile = path.join(getExtensionRoot(), 'package.nls.json');
        if (fs.existsSync(defaultNlsFile)) {
            const contents = fs.readFileSync(defaultNlsFile, 'utf8');
            defaultCollection = JSON.parse(contents);
        } else {
            defaultCollection = {};
        }
    }
}
