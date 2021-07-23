import { BrowserMessageReader, BrowserMessageWriter, createConnection } from 'vscode-languageserver/browser';

import { DefaultCancellationProvider } from 'pyright-internal/common/cancellationUtils';
import { nullFileWatcherProvider } from 'pyright-internal/common/fileSystem';
import { WorkspaceMap } from 'pyright-internal/workspaceMap';

import { BrowserFileSystem } from './common/browserFileSystem';
import { PYRIGHT_COMMIT, VERSION } from './common/constants';
import { PylanceServer } from './server';

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

    try {
        new PylanceServer(
            {
                productName: 'Pylance',
                rootDirectory,
                version: `${VERSION} (pyright ${PYRIGHT_COMMIT.substring(0, 8)})`,
                workspaceMap: new WorkspaceMap(),
                fileSystem: new BrowserFileSystem(rootDirectory, config.distUrl),
                fileWatcherProvider: nullFileWatcherProvider,
                cancellationProvider: new DefaultCancellationProvider(),
            },
            createConnection(messageReader, messageWriter),
            (_1, _2) => undefined
        );
    } catch (e: any) {
        console.error(e?.message);
        console.error(e?.stack);
        throw e;
    }
}
