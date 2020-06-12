/*
 * serverSettings.test.ts
 *
 * serverSettings tests.
 */

import * as assert from 'assert';

import { AnalyzerService } from '../../pyright/server/src/analyzer/service';
import { DiagnosticSeverityOverrides } from '../../pyright/server/src/common/commandLineOptions';
import { NullConsole } from '../../pyright/server/src/common/console';
import { createDeferred } from '../../pyright/server/src/common/deferred';
import { FileSystem } from '../../pyright/server/src/common/fileSystem';
import { convertPathToUri, normalizeSlashes } from '../../pyright/server/src/common/pathUtils';
import { ServerSettings, WorkspaceServiceInstance } from '../../pyright/server/src/languageServerBase';
import { AnalyzerServiceExecutor } from '../../pyright/server/src/languageService/analyzerServiceExecutor';
import { TestFileSystem } from '../../pyright/server/src/tests/harness/vfs/filesystem';

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

test('expand workspace folder stubPath', () => {
    const workspace = createWorkspaceInstance();

    const serverSettings: ServerSettings = {
        stubPath: normalizeSlashes('${workspaceFolder}/stubs'),
    };

    AnalyzerServiceExecutor.runWithOptions(rootPath, workspace, serverSettings);
    assert(normalizeSlashes('/stubs'), workspace.serviceInstance.getConfigOptions().stubPath);
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
    return {
        workspaceName: `Test`,
        rootPath: rootPath,
        rootUri: convertPathToUri(rootPath),
        serviceInstance: new AnalyzerService('Test', fs ?? new TestFileSystem(false), new NullConsole()),
        disableLanguageServices: true,
        disableOrganizeImports: true,
        isInitialized: createDeferred<boolean>(),
    };
}
