/*
 * fourslashrunner.test.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Entry point that will read all *.fourslash.ts files and
 * register jest tests for them and run
 */
import * as path from 'path';
import * as consts from '../../pyright/server/src/common/consts';
import { combinePaths, normalizeSlashes, resolvePaths } from '../../pyright/server/src/common/pathUtils';
import { runFourSlashTest } from '../../pyright/server/src/tests/harness/fourslash/runner';
import * as host from '../../pyright/server/src/tests/harness/host';
import { srcFolder, typeshedFolder } from '../../pyright/server/src/tests/harness/vfs/factory';
import { MODULE_PATH } from '../../pyright/server/src/tests/harness/vfs/filesystem';
import { createPyrxImportResolver } from '../../pyrxImportResolver';

describe('pyrx fourslash tests', () => {
    const testFiles: string[] = [];

    const basePath = path.resolve(path.dirname(module.filename), 'fourslash/');
    for (const file of host.HOST.listFiles(basePath, /.*\.fourslash\.ts$/i, { recursive: true })) {
        testFiles.push(file);
    }

    // make sure default folders exist
    const bundledStubsFolderPath = resolvePaths(host.HOST.getWorkspaceRoot(), '../../bundled-stubs');
    const typeshedFolderPath = resolvePaths(host.HOST.getWorkspaceRoot(), '../../pyright/client/' + consts.TYPESHED_FALLBACK);
    if (!host.HOST.directoryExists(bundledStubsFolderPath) ||
        !host.HOST.directoryExists(typeshedFolderPath)) {

        throw new Error(`expected folder not exist ${ bundledStubsFolderPath } or ${ typeshedFolderPath }`);
    }

    const bundledStubsFolder = combinePaths(MODULE_PATH, normalizeSlashes('bundled-stubs'));
    const mountedPaths = new Map<string, string>();
    mountedPaths.set(bundledStubsFolder, bundledStubsFolderPath);
    mountedPaths.set(typeshedFolder, typeshedFolderPath);

    testFiles.forEach(file => {
        describe(file, () => {
            const fn = normalizeSlashes(file);
            const justName = fn.replace(/^.*[\\/]/, '');

            it('fourslash test ' + justName + ' runs correctly', () => {
                runFourSlashTest(srcFolder, fn, mountedPaths, createPyrxImportResolver);
            });
        });
    });
});
