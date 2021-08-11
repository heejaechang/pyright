import { CodeActionKind } from 'vscode-languageserver';

import { ConsoleWithLogLevel, LogLevel } from 'pyright-internal/common/console';
import { FileBasedCancellationProvider } from 'pyright-internal/common/fileBasedCancellationUtils';
import { createFromRealFileSystem, WorkspaceFileWatcherProvider } from 'pyright-internal/common/realFileSystem';
import { run } from 'pyright-internal/nodeServer';
import { WorkspaceMap } from 'pyright-internal/workspaceMap';

import { BackgroundAnalysis, runBackgroundThread } from './backgroundAnalysis';
import { CommandController } from './commands/commandController';
import { PYRIGHT_COMMIT, VERSION } from './common/constants';
import { PylanceFullAccessHost } from './common/pylanceFullAccessHost';
import { IntelliCodeExtension } from './intelliCode/extension';
import { PylanceServer, PylanceServerSettings } from './server';

export function main() {
    const rootDirectory = __dirname;

    run((conn) => {
        const serverSettings: PylanceServerSettings = {
            autoSearchPaths: true,
            disableLanguageServices: false,
            openFilesOnly: true,
            useLibraryCodeForTypes: true,
            watchForSourceChanges: true,
            watchForLibraryChanges: true,
            watchForConfigChanges: true,
            typeCheckingMode: 'off',
            diagnosticSeverityOverrides: {},
            logLevel: LogLevel.Info,
            autoImportCompletions: true,
            indexing: false,
            completeFunctionParens: false,
            enableExtractCodeAction: true,
            useImportHeuristic: false,
        };

        const console = new ConsoleWithLogLevel(conn.console);
        const workspaceMap = new WorkspaceMap();
        const fileWatcherProvider = new WorkspaceFileWatcherProvider(workspaceMap, console);
        const fileSystem = createFromRealFileSystem(console, fileWatcherProvider);
        const intelliCode = new IntelliCodeExtension();

        new PylanceServer(
            {
                productName: 'Pylance',
                rootDirectory,
                version: `${VERSION} (pyright ${PYRIGHT_COMMIT.substring(0, 8)})`,
                workspaceMap,
                fileSystem,
                fileWatcherProvider,
                cancellationProvider: new FileBasedCancellationProvider('bg'),
                extension: intelliCode,
                supportedCommands: CommandController.supportedCommands(),
                supportedCodeActions: [CodeActionKind.QuickFix, CodeActionKind.RefactorExtract],
            },
            conn,
            console,
            serverSettings,
            (t, c) => new BackgroundAnalysis(t, c),
            (t, f) => PylanceFullAccessHost.createHost(t, f)
        );
    }, runBackgroundThread);
}
