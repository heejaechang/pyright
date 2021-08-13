import { BrowserMessageReader, BrowserMessageWriter, createConnection } from 'vscode-languageserver/browser';

import { DefaultCancellationProvider } from 'pyright-internal/common/cancellationUtils';
import { DiagnosticSeverityOverrides } from 'pyright-internal/common/commandLineOptions';
import { ConsoleWithLogLevel, LogLevel } from 'pyright-internal/common/console';
import { DiagnosticRule } from 'pyright-internal/common/diagnosticRules';
import { nullFileWatcherProvider } from 'pyright-internal/common/fileSystem';
import { NoAccessHost } from 'pyright-internal/common/host';
import { WorkspaceMap } from 'pyright-internal/workspaceMap';

import { Commands } from './commands/commands';
import { BrowserFileSystem } from './common/browserFileSystem';
import { PYRIGHT_COMMIT, VERSION } from './common/constants';
import { PylanceServer, PylanceServerSettings } from './server';

export interface BrowserConfig {
    distUrl: string; // URL to Pylance's dist folder.
}

declare let self: any;

export function main() {
    // One-time message handler to recieve the startup config.
    self.onmessage = (e: any) => {
        // Ensure that the real onmessage has been registered before we
        // return from this handler.
        const messageReader = new BrowserMessageReader(self);
        const messageWriter = new BrowserMessageWriter(self);

        // onmessage has been replaced by BrowserMessageReader;
        // return from this handler so more messages can be handled
        // by running the server in a new promise.
        runServer(e.data, messageReader, messageWriter);
    };
}

async function runServer(
    config: BrowserConfig,
    messageReader: BrowserMessageReader,
    messageWriter: BrowserMessageWriter
) {
    const rootDirectory = __dirname;
    const serverSettings: PylanceServerSettings = {
        autoSearchPaths: false,
        disableLanguageServices: false,
        openFilesOnly: true,
        useLibraryCodeForTypes: false,
        watchForSourceChanges: false,
        watchForLibraryChanges: false,
        watchForConfigChanges: false,
        typeCheckingMode: 'off',
        diagnosticSeverityOverrides: {
            [DiagnosticRule.reportMissingImports]: DiagnosticSeverityOverrides.None,
            [DiagnosticRule.reportMissingModuleSource]: DiagnosticSeverityOverrides.None,
        },
        logLevel: LogLevel.Info,
        autoImportCompletions: true,
        indexing: false,
        completeFunctionParens: false,
        enableExtractCodeAction: false,
    };

    try {
        const conn = createConnection(messageReader, messageWriter);
        const console = new ConsoleWithLogLevel(conn.console);
        new PylanceServer(
            {
                productName: 'Pylance',
                rootDirectory,
                version: `${VERSION} (pyright ${PYRIGHT_COMMIT.substring(0, 8)})`,
                workspaceMap: new WorkspaceMap(),
                fileSystem: new BrowserFileSystem(rootDirectory, config.distUrl),
                fileWatcherProvider: nullFileWatcherProvider,
                cancellationProvider: new DefaultCancellationProvider(),
                disableChecker: true,
                supportedCommands: [Commands.completionAccepted],
            },
            conn,
            console,
            serverSettings,
            () => undefined,
            () => new NoAccessHost()
        );
    } catch (e: any) {
        console.error(e?.message);
        console.error(e?.stack);
        throw e;
    }
}
