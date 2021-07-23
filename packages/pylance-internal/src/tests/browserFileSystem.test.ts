import assert from 'assert';
import { Dirent } from 'fs';

import { stdLibFolderName } from 'pyright-internal/analyzer/pythonPathUtils';
import { nullFileWatcherProvider } from 'pyright-internal/common/fileSystem';
import { typeshedFallback } from 'pyright-internal/common/pathConsts';
import { combinePaths, isFileSystemCaseSensitive, normalizeSlashes } from 'pyright-internal/common/pathUtils';

import { BrowserFileSystem, normalizeWebSlashes } from '../common/browserFileSystem';
import { readTestDataFile } from './testUtils';

const root = '/';
const xmlRequestsMap = new Map<string, TestState>();

function getStdLibPath(...paths: string[]) {
    return normalizeSlashes(combinePaths(root, typeshedFallback, stdLibFolderName, ...paths));
}

describe('browserFileSystem', () => {
    const baseUrl = 'http://localhost:8080/';
    let fs: BrowserFileSystem;

    beforeEach(() => {
        const folderIndex = new FolderIndexState(baseUrl);
        xmlRequestsMap.set(folderIndex.url, folderIndex);

        (global as any).XMLHttpRequest = XMLHttpRequest;

        fs = new BrowserFileSystem(root, baseUrl);
        assert(fs);
    });

    afterEach(() => {
        xmlRequestsMap.clear();
        delete (global as any).XMLHttpRequest;
    });

    test('module path', () => {
        assert.strictEqual(normalizeSlashes(root), fs.getModulePath());
    });

    test('check root', () => {
        assert(fs.existsSync(normalizeSlashes('/')));
    });

    test('non existent', () => {
        assert(!fs.existsSync(normalizeSlashes('/non-existent')));
    });

    test('check builtIn', () => {
        assert(fs.existsSync(getStdLibPath('builtins.pyi')));
    });

    test('case sensitivity', () => {
        assert(!isFileSystemCaseSensitive(fs));
    });

    test('file watcher', () => {
        const nullFileWatcher = nullFileWatcherProvider.createFileWatcher([], () => {
            // empty
        });

        assert.strictEqual(
            nullFileWatcher,
            fs.createFileSystemWatcher([], () => {
                // empty
            })
        );
    });

    test('file read', () => {
        const builtInText = readTestDataFile('builtins.pyi');
        const filePath = getStdLibPath('builtins.pyi');
        const state = new TestState(
            200,
            builtInText,
            'GET',
            normalizeWebSlashes(baseUrl + filePath.substr(root.length))
        );
        xmlRequestsMap.set(state.url, state);

        assert.strictEqual(fs.readFileSync(filePath), builtInText);
    });

    test('read dir', () => {
        const stdLib = getStdLibPath();
        const names = fs.readdirSync(stdLib);
        const entries = new Map<string, Dirent>();
        fs.readdirEntriesSync(stdLib).forEach((v) => entries.set(v.name, v));

        assert.strictEqual(names.length, entries.size);

        for (const name of names) {
            const entry = entries.get(name);
            assert(!!entry);

            const stat = fs.statSync(combinePaths(stdLib, name));

            assert.strictEqual(stat.isFile(), entry.isFile());
            assert.strictEqual(stat.isDirectory(), entry.isDirectory());
        }
    });
});

const folderIndexText = readTestDataFile('folderIndex.json');

class TestState {
    public sent = false;

    constructor(public status: number, public responseText: string, public method: string, public url: string) {
        this.status = status;
        this.responseText = responseText;
        this.method = method;
        this.url = url;
    }
}

class FolderIndexState extends TestState {
    constructor(baseUrl: string) {
        super(200, folderIndexText, 'GET', baseUrl + 'folderIndex.json');
    }
}

class XMLHttpRequest {
    private _state: TestState | undefined;

    get status(): number {
        return this._state?.status ?? 404;
    }

    get responseText(): string {
        return this._state?.responseText ?? '';
    }

    open(method: string, url: string, async: boolean): void {
        this._state = xmlRequestsMap.get(url);

        assert.strictEqual(method, this._state?.method);
        assert.strictEqual(url, this._state?.url);
        assert(!async);
    }

    send(): void {
        if (this._state) {
            this._state.sent = true;
        }
    }
}
