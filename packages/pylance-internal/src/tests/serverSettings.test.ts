/*
 * serverSettings.test.ts
 *
 * serverSettings tests.
 */

import assert from 'assert';

import { AnalyzerService } from 'pyright-internal/analyzer/service';
import { DiagnosticSeverityOverrides } from 'pyright-internal/common/commandLineOptions';
import { NullConsole } from 'pyright-internal/common/console';
import { createDeferred } from 'pyright-internal/common/deferred';
import { FileSystem } from 'pyright-internal/common/fileSystem';
import * as pathConsts from 'pyright-internal/common/pathConsts';
import { combinePaths, convertPathToUri, normalizeSlashes } from 'pyright-internal/common/pathUtils';
import { ServerSettings, WorkspaceServiceInstance } from 'pyright-internal/languageServerBase';
import { AnalyzerServiceExecutor } from 'pyright-internal/languageService/analyzerServiceExecutor';
import { TestFileSystem } from 'pyright-internal/tests/harness/vfs/filesystem';

const rootPath = normalizeSlashes('/');

test('default stubPath', () => {
    const workspace = createWorkspaceInstance();

    const serverSettings: ServerSettings = {};
    AnalyzerServiceExecutor.runWithOptions(rootPath, workspace, serverSettings);
    assert(normalizeSlashes('/typing'), workspace.serviceInstance.getConfigOptions().stubPath);
});

test('custom stubPath', () => {
    const workspace = createWorkspaceInstance();

    const serverSettings: ServerSettings = {
        stubPath: normalizeSlashes('/stubs'),
    };
    AnalyzerServiceExecutor.runWithOptions(rootPath, workspace, serverSettings);
    assert(normalizeSlashes('/stubs'), workspace.serviceInstance.getConfigOptions().stubPath);
});

test('duplicated stubPath', () => {
    const fs = new TestFileSystem(false, { cwd: normalizeSlashes('/') });
    const workspace = createWorkspaceInstance(fs);

    const serverSettings: ServerSettings = {
        stubPath: normalizeSlashes('/stubs'),
    };

    fs.writeFileSync(normalizeSlashes('/mspythonconfig.json'), '{ "typingsPath": "/typing" }');

    AnalyzerServiceExecutor.runWithOptions(rootPath, workspace, serverSettings);
    assert(normalizeSlashes('/typing'), workspace.serviceInstance.getConfigOptions().stubPath);
});

test('diagnostic overrides', () => {
    const workspace = createWorkspaceInstance();

    const serverSettings: ServerSettings = {
        diagnosticSeverityOverrides: {
            reportGeneralTypeIssues: DiagnosticSeverityOverrides.Warning,
        },
    };

    AnalyzerServiceExecutor.runWithOptions(rootPath, workspace, serverSettings);
    assert('warning', workspace.serviceInstance.getConfigOptions().diagnosticRuleSet.reportGeneralTypeIssues);
});

test('diagnostic overrides information', () => {
    const workspace = createWorkspaceInstance();

    const serverSettings: ServerSettings = {
        diagnosticSeverityOverrides: {
            reportGeneralTypeIssues: DiagnosticSeverityOverrides.Information,
        },
    };

    AnalyzerServiceExecutor.runWithOptions(rootPath, workspace, serverSettings);
    assert('information', workspace.serviceInstance.getConfigOptions().diagnosticRuleSet.reportGeneralTypeIssues);
});

test('mspythonconfig information support', () => {
    const fs = new TestFileSystem(false, { cwd: normalizeSlashes('/') });
    const workspace = createWorkspaceInstance(fs);

    fs.writeFileSync(normalizeSlashes('/mspythonconfig.json'), '{ "reportGeneralTypeIssues": "information" }');

    AnalyzerServiceExecutor.runWithOptions(rootPath, workspace, {});
    assert('information', workspace.serviceInstance.getConfigOptions().diagnosticRuleSet.reportGeneralTypeIssues);
});

function createWorkspaceInstance(fs?: FileSystem): WorkspaceServiceInstance {
    fs = fs ?? new TestFileSystem(/* ignoreCase */ false, { cwd: normalizeSlashes('/') });

    // create type stub folder
    const typeshedPath = combinePaths(fs.getModulePath(), pathConsts.typeshedFallback);
    if (!fs.existsSync(typeshedPath)) {
        fs.mkdirSync(typeshedPath, { recursive: true });
    }

    return {
        workspaceName: `Test`,
        rootPath: rootPath,
        rootUri: convertPathToUri(fs, rootPath),
        serviceInstance: new AnalyzerService('Test', fs, new NullConsole()),
        disableLanguageServices: true,
        disableOrganizeImports: true,
        isInitialized: createDeferred<boolean>(),
    };
}
