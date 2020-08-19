/*
 * pylanceFourSlashRunner.test.ts
 * Copyright (c) Microsoft Corporation.
 *
 * Entry point that will read all *.fourslash.ts files and
 * register jest tests for them and run
 */

import * as path from 'path';
import { CancellationToken, CodeAction, ExecuteCommandParams } from 'vscode-languageserver';

import { createPylanceImportResolver } from '../../pylanceImportResolver';
import { ImportResolverFactory } from '../../pyright/server/src/analyzer/importResolver';
import * as consts from '../../pyright/server/src/common/pathConsts';
import { combinePaths, normalizeSlashes, resolvePaths } from '../../pyright/server/src/common/pathUtils';
import { Range } from '../../pyright/server/src/common/textRange';
import { LanguageServerInterface, WorkspaceServiceInstance } from '../../pyright/server/src/languageServerBase';
import { runFourSlashTest } from '../../pyright/server/src/tests/harness/fourslash/runner';
import { HostSpecificFeatures } from '../../pyright/server/src/tests/harness/fourslash/testState';
import * as host from '../../pyright/server/src/tests/harness/host';
import { typeshedFolder } from '../../pyright/server/src/tests/harness/vfs/factory';
import { MODULE_PATH } from '../../pyright/server/src/tests/harness/vfs/filesystem';
import { CommandController } from '../commands/commandController';
import { CodeActionProvider } from '../languageService/codeActionProvider';

class PylanceFeatures implements HostSpecificFeatures {
    importResolverFactory: ImportResolverFactory = createPylanceImportResolver;
    getCodeActionsForPosition(
        workspace: WorkspaceServiceInstance,
        filePath: string,
        range: Range,
        token: CancellationToken
    ): Promise<CodeAction[]> {
        return CodeActionProvider.getCodeActionsForPosition(workspace, filePath, range, token);
    }
    execute(ls: LanguageServerInterface, params: ExecuteCommandParams, token: CancellationToken): Promise<any> {
        const controller = new CommandController(ls);
        return controller.execute(params, token);
    }
}

describe('Pylance fourslash tests', () => {
    const testFiles: string[] = [];

    const basePath = path.resolve(path.dirname(module.filename), 'fourslash/');
    for (const file of host.HOST.listFiles(basePath, /.*\.fourslash\.ts$/i, { recursive: true })) {
        testFiles.push(file);
    }

    // make sure default folders exist
    const bundledStubsFolderPath = resolvePaths(host.HOST.getWorkspaceRoot(), '../../bundled-stubs');
    const typeshedFolderPath = resolvePaths(
        host.HOST.getWorkspaceRoot(),
        '../../pyright/client/' + consts.typeshedFallback
    );
    if (!host.HOST.directoryExists(bundledStubsFolderPath) || !host.HOST.directoryExists(typeshedFolderPath)) {
        throw new Error(`expected folder not exist ${bundledStubsFolderPath} or ${typeshedFolderPath}`);
    }

    const bundledStubsFolder = combinePaths(MODULE_PATH, normalizeSlashes('bundled-stubs'));
    const mountedPaths = new Map<string, string>();
    mountedPaths.set(bundledStubsFolder, bundledStubsFolderPath);
    mountedPaths.set(typeshedFolder, typeshedFolderPath);

    const pylanceFeatures = new PylanceFeatures();

    testFiles.forEach((file) => {
        describe(file, () => {
            const fn = normalizeSlashes(file);
            const justName = fn.replace(/^.*[\\/]/, '');

            it('fourslash test ' + justName + ' run', (cb) => {
                runFourSlashTest(MODULE_PATH, fn, cb, mountedPaths, pylanceFeatures);
            });
        });
    });
});
