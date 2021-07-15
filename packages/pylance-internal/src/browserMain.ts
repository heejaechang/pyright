import { BrowserMessageReader, BrowserMessageWriter, createConnection } from 'vscode-languageserver/browser';

import { PylanceServer } from './server';

declare let self: any;

export function main() {
    const messageReader = new BrowserMessageReader(self);
    const messageWriter = new BrowserMessageWriter(self);
    new PylanceServer(createConnection(messageReader, messageWriter));
}
