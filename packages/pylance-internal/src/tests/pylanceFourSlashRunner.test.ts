/*
 * pylanceFourSlashRunner.test.ts
 * Copyright (c) Microsoft Corporation.
 *
 * Entry point that will read all *.fourslash.ts files and
 * register jest tests for them and run
 */

import * as path from 'path';
import { CancellationToken, CodeAction, ExecuteCommandParams } from 'vscode-languageserver';

import { ImportResolverFactory } from 'pyright-internal/analyzer/importResolver';
import { createConfigOptionsFrom } from 'pyright-internal/backgroundThreadBase';
import { NullConsole } from 'pyright-internal/common/console';
import * as consts from 'pyright-internal/common/pathConsts';
import { combinePaths, normalizeSlashes, resolvePaths } from 'pyright-internal/common/pathUtils';
import { Range } from 'pyright-internal/common/textRange';
import { LanguageServerInterface, WorkspaceServiceInstance } from 'pyright-internal/languageServerBase';
import { IndexResults } from 'pyright-internal/languageService/documentSymbolProvider';
import { FourSlashData } from 'pyright-internal/tests/harness/fourslash/fourSlashTypes';
import { runFourSlashTest } from 'pyright-internal/tests/harness/fourslash/runner';
import { HostSpecificFeatures } from 'pyright-internal/tests/harness/fourslash/testState';
import * as host from 'pyright-internal/tests/harness/testHost';
import { typeshedFolder } from 'pyright-internal/tests/harness/vfs/factory';
import { MODULE_PATH } from 'pyright-internal/tests/harness/vfs/filesystem';

import { CommandController } from '../commands/commandController';
import { CodeActionProvider } from '../languageService/codeActionProvider';
import { createPylanceImportResolver } from '../pylanceImportResolver';
import { PylanceWorkspaceServiceInstance } from '../server';
import { Indexer } from '../services/indexer';
import { PylanceTestState } from './pylanceTestState';

const bundledStubsFolder = combinePaths(MODULE_PATH, 'bundled', 'stubs');

class PylanceFeatures implements HostSpecificFeatures {
    importResolverFactory: ImportResolverFactory = createPylanceImportResolver;
    runIndexer(workspace: WorkspaceServiceInstance, noStdLib: boolean): void {
        const workspaceMap = new Map<string, IndexResults>();
        workspace.serviceInstance.test_program.indexWorkspace((p, r) => workspaceMap.set(p, r), CancellationToken.None);

        const configOptions = workspace.serviceInstance.getConfigOptions();
        const excludes = [];
        if (noStdLib) {
            excludes.push(typeshedFolder, bundledStubsFolder);
        }

        // create indices for libraries,
        // make sure to clone configOption since libraryMap will modify the config
        const libraryMap = Indexer.indexLibraries(
            workspace.serviceInstance.getImportResolver(),
            createConfigOptionsFrom(configOptions),
            new NullConsole(),
            'Test',
            excludes,
            CancellationToken.None
        );

        workspace.serviceInstance.test_setIndexing(workspaceMap, libraryMap);
    }
    getCodeActionsForPosition(
        workspace: WorkspaceServiceInstance,
        filePath: string,
        range: Range,
        token: CancellationToken
    ): Promise<CodeAction[]> {
        return CodeActionProvider.getCodeActionsForPosition(
            workspace as PylanceWorkspaceServiceInstance,
            filePath,
            range,
            /* hasVSCodeExtension */ true,
            token
        );
    }
    execute(ls: LanguageServerInterface, params: ExecuteCommandParams, token: CancellationToken): Promise<any> {
        const controller = new CommandController(ls, undefined, /* hasVSCodeExtension */ true);
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
    const bundledStubsFolderPath = resolvePaths(__dirname, '../../bundled/stubs');
    const typeshedFolderPath = resolvePaths(
        __dirname,
        '../../../pyright/packages/pyright-internal/' + consts.typeshedFallback
    );
    if (!host.HOST.directoryExists(bundledStubsFolderPath) || !host.HOST.directoryExists(typeshedFolderPath)) {
        throw new Error(`expected folder not exist ${bundledStubsFolderPath} or ${typeshedFolderPath}`);
    }

    const mountedPaths = new Map<string, string>();
    mountedPaths.set(bundledStubsFolder, bundledStubsFolderPath);
    // We use pyright's typeshed-fallback. If this changes, adjust the below.
    // mountedPaths.set(typeshedFolder, typeshedFolderPath);

    const pylanceFeatures = new PylanceFeatures();

    testFiles.forEach((file) => {
        describe(file, () => {
            const fn = normalizeSlashes(file);
            const justName = fn.replace(/^.*[\\/]/, '');

            it('fourslash test ' + justName + ' run', (cb) => {
                runFourSlashTest(
                    MODULE_PATH,
                    fn,
                    cb,
                    mountedPaths,
                    pylanceFeatures,
                    (
                        basePath: string,
                        testData: FourSlashData,
                        mountPaths?: Map<string, string>,
                        hostSpecificFeatures?: HostSpecificFeatures
                    ) => new PylanceTestState(basePath, testData, mountPaths, hostSpecificFeatures)
                );
            });
        });
    });
});
