import * as vscode from 'vscode';
import { LanguageClientOptions } from 'vscode-languageclient';
import { LanguageClient } from 'vscode-languageclient/browser';

import type { BrowserConfig } from 'pylance-internal/browserServer';

declare const Worker: {
    new (stringUrl: string): any;
};

export function activate(context: vscode.ExtensionContext) {
    const serverMain = vscode.Uri.joinPath(context.extensionUri, 'dist/browser.server.js');
    try {
        const worker = new Worker(serverMain.toString());

        // Pass the configuration as the first message to the worker so it can
        // have info like the URL of the dist folder early enough.
        //
        // This is the same method used by the TS worker:
        // https://github.com/microsoft/vscode/blob/90aa979bb75a795fd8c33d38aee263ea655270d0/extensions/typescript-language-features/src/tsServer/serverProcess.browser.ts#L55
        const config: BrowserConfig = {
            distUrl: vscode.Uri.joinPath(context.extensionUri, 'dist').toString(),
        };
        worker.postMessage(config);

        const clientOptions: LanguageClientOptions = {
            // Register the server for python source files.
            documentSelector: [
                {
                    language: 'python',
                },
            ],
            synchronize: {
                // Synchronize the setting section to the server.
                configurationSection: ['python', 'pyright'],
            },
            // TODO: replace cancellation strategy with SharedArrayBuffer (shared worker memory)
            // connectionOptions: { cancellationStrategy: cancellationStrategy },
        };

        const languageClient = new LanguageClient('python', 'Pylance', clientOptions, worker);
        const disposable = languageClient.start();

        context.subscriptions.push(disposable);

        languageClient.onTelemetry((eventInfo) => {
            console.log(`onTelemetry EventName: ${eventInfo.EventName}`);

            for (const [prop, value] of Object.entries(eventInfo.Properties)) {
                console.log(`               Property: ${prop} : ${value}`);
            }

            for (const [measure, value] of Object.entries(eventInfo.Measurements)) {
                console.log(`               Measurement: ${measure} : ${value}`);
            }
        });
    } catch (e) {
        console.log(e);
    }
}
