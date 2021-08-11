/*
 * importResolver.test.ts
 *
 * importResolver tests.
 */

import assert from 'assert';

import { combinePaths, getDirectoryPath, normalizeSlashes } from 'pyright-internal//common/pathUtils';
import { ConfigOptions } from 'pyright-internal/common/configOptions';
import { FileSystem } from 'pyright-internal/common/fileSystem';
import { FullAccessHost } from 'pyright-internal/common/fullAccessHost';
import { PyrightFileSystem } from 'pyright-internal/pyrightFileSystem';
import { TestFileSystem } from 'pyright-internal/tests/harness/vfs/filesystem';

import { PylanceImportResolver } from './../pylanceImportResolver';

test('import side by side file root', () => {
    const files = [
        {
            path: combinePaths('/', 'file1.py'),
            content: 'def test1(): ...',
        },
        {
            path: combinePaths('/', 'file2.py'),
            content: 'def test2(): ...',
        },
    ];

    const importResult = getImportResult(files, ['file1']);
    assert(importResult.isImportFound);
    assert.strictEqual(1, importResult.resolvedPaths.filter((f) => f === combinePaths('/', 'file1.py')).length);
});

test('import side by side file sub folder', () => {
    const files = [
        {
            path: combinePaths('/test', 'file1.py'),
            content: 'def test1(): ...',
        },
        {
            path: combinePaths('/test', 'file2.py'),
            content: 'def test2(): ...',
        },
    ];

    const importResult = getImportResult(files, ['file1']);
    assert(importResult.isImportFound);
    assert.strictEqual(1, importResult.resolvedPaths.filter((f) => f === combinePaths('/test', 'file1.py')).length);
});

test('import side by side file sub under src folder', () => {
    const files = [
        {
            path: combinePaths('/src/nested', 'file1.py'),
            content: 'def test1(): ...',
        },
        {
            path: combinePaths('/src/nested', 'file2.py'),
            content: 'def test2(): ...',
        },
    ];

    const importResult = getImportResult(files, ['file1']);
    assert(importResult.isImportFound);
    assert.strictEqual(
        1,
        importResult.resolvedPaths.filter((f) => f === combinePaths('/src/nested', 'file1.py')).length
    );
});

test('import file sub under containing folder', () => {
    const files = [
        {
            path: combinePaths('/src/nested', 'file1.py'),
            content: 'def test1(): ...',
        },
        {
            path: combinePaths('/src/nested/nested2', 'file2.py'),
            content: 'def test2(): ...',
        },
    ];

    const importResult = getImportResult(files, ['file1']);
    assert(importResult.isImportFound);
    assert.strictEqual(
        1,
        importResult.resolvedPaths.filter((f) => f === combinePaths('/src/nested', 'file1.py')).length
    );
});

test('import side by side file sub under lib folder', () => {
    const files = [
        {
            path: combinePaths('/lib/site-packages/myLib', 'file1.py'),
            content: 'def test1(): ...',
        },
        {
            path: combinePaths('/lib/site-packages/myLib', 'file2.py'),
            content: 'def test2(): ...',
        },
    ];

    const importResult = getImportResult(files, ['file1']);
    assert(!importResult.isImportFound);
});

test('dont walk up the root', () => {
    const files = [
        {
            path: combinePaths('/', 'file1.py'),
            content: 'def test1(): ...',
        },
    ];

    const importResult = getImportResult(files, ['notExist'], (c) => (c.projectRoot = ''));
    assert(!importResult.isImportFound);
});

function getImportResult(
    files: { path: string; content: string }[],
    nameParts: string[],
    setup?: (c: ConfigOptions) => void
) {
    setup =
        setup ??
        ((c) => {
            /* empty */
        });

    const fs = createFileSystem(files);
    const configOptions = getConfigOption(fs);
    setup(configOptions);

    const file = files[files.length - 1].path;
    const importResolver = new PylanceImportResolver(fs, configOptions, new FullAccessHost(fs));
    importResolver.useImportHeuristic(true);

    const importResult = importResolver.resolveImport(file, configOptions.findExecEnvironment(file), {
        leadingDots: 0,
        nameParts: nameParts,
        importedSymbols: [],
    });

    return importResult;
}

function getConfigOption(fs: FileSystem) {
    const configOptions = new ConfigOptions(normalizeSlashes('/'));
    configOptions.venvPath = fs.getModulePath();
    configOptions.venv = fs.getModulePath();

    return configOptions;
}

function createFileSystem(files: { path: string; content: string }[]): FileSystem {
    const fs = new TestFileSystem(/* ignoreCase */ false, { cwd: normalizeSlashes('/') });

    for (const file of files) {
        const path = normalizeSlashes(file.path);
        const dir = getDirectoryPath(path);
        fs.mkdirpSync(dir);

        fs.writeFileSync(path, file.content);
    }

    return new PyrightFileSystem(fs);
}
