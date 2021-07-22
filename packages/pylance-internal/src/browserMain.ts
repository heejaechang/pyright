import type { Dirent, ReadStream, WriteStream } from 'fs';
import { BrowserMessageReader, BrowserMessageWriter, createConnection } from 'vscode-languageserver/browser';

import { DefaultCancellationProvider } from 'pyright-internal/common/cancellationUtils';
import {
    FileSystem,
    FileWatcher,
    FileWatcherEventHandler,
    MkDirOptions,
    nullFileWatcherProvider,
    Stats,
    TmpfileOptions,
} from 'pyright-internal/common/fileSystem';
import { WorkspaceMap } from 'pyright-internal/workspaceMap';

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
                fileSystem: new NullFileSystem(),
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

class NullFileSystem implements FileSystem {
    existsSync(path: string): boolean {
        return false;
    }
    mkdirSync(path: string, options?: MkDirOptions): void {
        // empty
    }
    chdir(path: string): void {
        // empty
    }
    readdirEntriesSync(path: string): Dirent[] {
        return [];
    }

    readdirSync(path: string): string[] {
        return [];
    }
    readFileSync(path: string, encoding?: null): Buffer;
    readFileSync(path: string, encoding: BufferEncoding): string;
    readFileSync(path: string, encoding?: BufferEncoding | null): string | Buffer;
    readFileSync(path: any, encoding?: any): string | Buffer {
        return '';
    }
    writeFileSync(path: string, data: string | Buffer, encoding: BufferEncoding | null): void {
        // empty
    }
    statSync(path: string): Stats {
        throw new Error('Method not implemented.');
    }
    unlinkSync(path: string): void {
        // empty
    }
    realpathSync(path: string): string {
        return path;
    }
    getModulePath(): string {
        return '/';
    }
    createFileSystemWatcher(paths: string[], listener: FileWatcherEventHandler): FileWatcher {
        return nullFileWatcherProvider.createFileWatcher(paths, listener);
    }
    createReadStream(path: string): ReadStream {
        throw new Error('Method not implemented.');
    }
    createWriteStream(path: string): WriteStream {
        throw new Error('Method not implemented.');
    }
    copyFileSync(src: string, dst: string): void {
        // empty
    }
    readFile(path: string): Promise<Buffer> {
        throw new Error('Method not implemented.');
    }
    readFileText(path: string, encoding?: BufferEncoding): Promise<string> {
        throw new Error('Method not implemented.');
    }
    tmpdir(): string {
        throw new Error('Method not implemented.');
    }
    tmpfile(options?: TmpfileOptions): string {
        throw new Error('Method not implemented.');
    }
    realCasePath(path: string): string {
        return path;
    }
}
