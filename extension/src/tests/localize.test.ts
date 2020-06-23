// Copyright (c) Microsoft Corporation. All rights reserved.

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

import * as localize from '../common/localize';
import { getExtensionRoot } from '../common/utils';

const defaultNLSFile = path.join(getExtensionRoot(), 'package.nls.json');

// Defines a Mocha test suite to group tests of similar kind together
describe('Localization', () => {
    // Note: We use package.nls.json by default for tests.  Use the
    // setLocale() helper to switch to a different locale.
    let localeFiles: string[];
    let nls_orig: string | undefined;

    beforeEach(() => {
        localeFiles = [];
        nls_orig = process.env.VSCODE_NLS_CONFIG;
        setLocale('en-us');
        // Ensure each test starts fresh.
        localize._resetCollections();
    });

    afterEach(() => {
        if (nls_orig) {
            process.env.VSCODE_NLS_CONFIG = nls_orig;
        } else {
            delete process.env.VSCODE_NLS_CONFIG;
        }

        const filenames = localeFiles;
        localeFiles = [];
        for (const filename of filenames) {
            fs.unlinkSync(filename);
        }
    });

    function addLocale(locale: string, nls: Record<string, string>) {
        const filename = addLocaleFile(locale, nls);
        localeFiles.push(filename);
    }

    test('keys', () => {
        const val = localize.LanguageServer.installedButInactive();
        assert.equal(
            val,
            'Would you like to make Pylance your default language server for Python?',
            'LanguageServer string does not match'
        );
    });

    test('keys (Russian)', () => {
        // Force a config change
        setLocale('ru');

        const val = localize.LanguageServer.turnItOn();
        assert.equal(val, 'Да, и перезагрузить окно', 'turnItOn is not being translated');
    });

    test('key found for locale', () => {
        addLocale('spam', {
            'LanguageServer.remindMeLater': '???',
        });
        setLocale('spam');

        const msg = localize.LanguageServer.remindMeLater();
        assert.equal(msg, '???', `key not found for locale, found '${msg}' instead`);
    });

    test('key not found for locale (default used)', () => {
        addLocale('spam', {
            'LanguageServer.remindMeLater': '???',
        });
        setLocale('spam');

        const msg = localize.LanguageServer.noThanks();
        assert.equal(msg, 'No thanks', `default not used (found '${msg}')`);
    });

    test('keys exist', () => {
        // Read in the JSON object for the package.nls.json
        const nlsCollection = getDefaultCollection();

        // Now match all of our namespace entries to our nls entries
        useEveryLocalization(localize);

        // Now verify all of the asked for keys exist
        const askedFor = localize._getAskedForCollection();
        const missing: Record<string, string> = {};
        Object.keys(askedFor).forEach((key: string) => {
            // Now check that this key exists somewhere in the nls collection
            if (!nlsCollection[key]) {
                missing[key] = askedFor[key];
            }
        });

        // If any missing keys, output an error
        const missingKeys = Object.keys(missing);
        if (missingKeys && missingKeys.length > 0) {
            let message = 'Missing keys. Add the following to package.nls.json:\n';
            missingKeys.forEach((k: string) => {
                message = message.concat(`\t"${k}" : "${missing[k]}",\n`);
            });
            assert.fail(message);
        }
    });
});

function addLocaleFile(locale: string, nls: Record<string, string>) {
    const filename = path.join(getExtensionRoot(), `package.nls.${locale}.json`);
    if (fs.existsSync(filename)) {
        throw Error(`NLS file ${filename} already exists`);
    }
    const contents = JSON.stringify(nls);
    fs.writeFileSync(filename, contents);
    return filename;
}

function setLocale(locale: string) {
    let nls: Record<string, string>;
    if (process.env.VSCODE_NLS_CONFIG) {
        nls = JSON.parse(process.env.VSCODE_NLS_CONFIG);
        nls.locale = locale;
    } else {
        nls = { locale: locale };
    }
    process.env.VSCODE_NLS_CONFIG = JSON.stringify(nls);
}

function getDefaultCollection() {
    if (!fs.existsSync(defaultNLSFile)) {
        throw Error('package.nls.json is missing');
    }
    const contents = fs.readFileSync(defaultNLSFile, 'utf8');
    return JSON.parse(contents);
}

function useEveryLocalization(topns: any) {
    // Read all of the namespaces from the localize import.
    const entries = Object.keys(topns);

    // Now match all of our namespace entries to our nls entries.
    entries.forEach((e: string) => {
        if (typeof topns[e] === 'function') {
            return;
        }
        // It must be a namespace.
        useEveryLocalizationInNS(topns[e]);
    });
}

function useEveryLocalizationInNS(ns: any) {
    // The namespace should have functions inside of it.
    const props = Object.keys(ns);

    // Run every function and cover every sub-namespace.
    // This should fill up our "asked-for keys" collection.
    props.forEach((key: string) => {
        if (typeof ns[key] === 'function') {
            const func = ns[key];
            func();
        } else {
            useEveryLocalizationInNS(ns[key]);
        }
    });
}
