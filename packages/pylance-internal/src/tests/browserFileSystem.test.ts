import assert from 'assert';
import { Dirent } from 'fs';

import { stdLibFolderName } from 'pyright-internal/analyzer/pythonPathUtils';
import { nullFileWatcherProvider } from 'pyright-internal/common/fileSystem';
import { typeshedFallback } from 'pyright-internal/common/pathConsts';
import {
    combinePaths,
    convertPathToUri,
    getRootLength,
    isFileSystemCaseSensitive,
    normalizeSlashes,
} from 'pyright-internal/common/pathUtils';
import { PyrightFileSystem } from 'pyright-internal/pyrightFileSystem';

import { BrowserFileSystem, normalizeWebSlashes } from '../common/browserFileSystem';
import { readTestDataFile } from './testUtils';

const root = '/';
const xmlRequestsMap = new Map<string, TestState>();

function getStdLibPath(...paths: string[]) {
    return normalizeSlashes(combinePaths(root, typeshedFallback, stdLibFolderName, ...paths));
}

describe('browserFileSystem', () => {
    const baseUrl = 'http://localhost:8080/root/';
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

    test('getUri stdLib', () => {
        const filePath = getStdLibPath('builtins.pyi');
        const uri = convertPathToUri(fs, filePath);
        assert.strictEqual(uri, normalizeWebSlashes(baseUrl + filePath.substr(root.length)));
    });

    test('getUri workspace file', () => {
        const filePath = '/sample-folder/test.py';
        const uri = convertPathToUri(fs, filePath);
        assert.strictEqual(uri, normalizeWebSlashes('memfs:' + normalizeWebSlashes(filePath)));
    });

    test('is mapped - user file', () => {
        const filePath = '/sample-folder/test.py';
        assert(!fs.isMappedFilePath(filePath));
    });

    test('is mapped - stdlib file', () => {
        const filePath = getStdLibPath('builtins.pyi');
        assert(fs.isMappedFilePath(filePath));
    });

    test('get original file - user file', () => {
        const filePath = '/sample-folder/test.py';
        assert.strictEqual(filePath, fs.getOriginalFilePath(filePath));
    });

    test('get original file - stdlib file', () => {
        const filePath = getStdLibPath('builtins.pyi');

        assert.strictEqual(
            combinePaths('/', 'root', filePath.substr(getRootLength(filePath))),
            fs.getOriginalFilePath(filePath)
        );
    });

    test('get mapped file - user file', () => {
        const filePath = '/sample-folder/test.py';
        assert.strictEqual(filePath, fs.getMappedFilePath(filePath));
    });

    test('get mapped file - stdlib file', () => {
        const filePath = getStdLibPath('builtins.pyi');
        const originalFile = combinePaths('/', 'root', filePath);

        assert.strictEqual(filePath, fs.getMappedFilePath(originalFile));
    });

    test('is mapped over pyrightFS - user file', () => {
        const filePath = '/sample-folder/test.py';

        const pyfs = new PyrightFileSystem(fs);
        assert(!pyfs.isMappedFilePath(filePath));
    });

    test('is mapped over pyrightFS - stdlib file', () => {
        const filePath = getStdLibPath('builtins.pyi');

        const pyfs = new PyrightFileSystem(fs);
        assert(pyfs.isMappedFilePath(filePath));
    });

    test('get original file over pyrightFS - user file', () => {
        const filePath = '/sample-folder/test.py';

        const pyfs = new PyrightFileSystem(fs);
        assert.strictEqual(filePath, pyfs.getOriginalFilePath(filePath));
    });

    test('get original file over pyrightFS - stdlib file', () => {
        const filePath = getStdLibPath('builtins.pyi');

        const pyfs = new PyrightFileSystem(fs);
        assert.strictEqual(
            combinePaths('/', 'root', filePath.substr(getRootLength(filePath))),
            pyfs.getOriginalFilePath(filePath)
        );
    });

    test('get mapped file over pyrightFS - user file', () => {
        const filePath = '/sample-folder/test.py';

        const pyfs = new PyrightFileSystem(fs);
        assert.strictEqual(filePath, pyfs.getMappedFilePath(filePath));
    });

    test('get mapped file over pyrightFS - stdlib file', () => {
        const filePath = getStdLibPath('builtins.pyi');
        const originalFile = combinePaths('/', 'root', filePath);

        const pyfs = new PyrightFileSystem(fs);
        assert.strictEqual(filePath, pyfs.getMappedFilePath(originalFile));
    });

    test('with PyrightFS', () => {
        const filePath = getStdLibPath('builtins.pyi');

        const pyfs = new PyrightFileSystem(fs);
        assert(pyfs.existsSync(filePath));
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
