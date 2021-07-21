import { CodeActionKind } from 'vscode-languageserver';

import { FileBasedCancellationProvider } from 'pyright-internal/common/fileBasedCancellationUtils';
import { createFromRealFileSystem, WorkspaceFileWatcherProvider } from 'pyright-internal/common/realFileSystem';
import { run } from 'pyright-internal/nodeServer';
import { WorkspaceMap } from 'pyright-internal/workspaceMap';

import { BackgroundAnalysis, runBackgroundThread } from './backgroundAnalysis';
import { CommandController } from './commands/commandController';
import { PYRIGHT_COMMIT, VERSION } from './common/constants';
import { IntelliCodeExtension } from './intelliCode/extension';
import { PylanceServer } from './server';

export function main() {
    const rootDirectory = __dirname;

    run((conn) => {
        const workspaceMap = new WorkspaceMap();
        const fileWatcherProvider = new WorkspaceFileWatcherProvider(workspaceMap);
        const fileSystem = createFromRealFileSystem(conn.console, fileWatcherProvider);
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
            (t, c) => new BackgroundAnalysis(t, c)
        );
    }, runBackgroundThread);
}
