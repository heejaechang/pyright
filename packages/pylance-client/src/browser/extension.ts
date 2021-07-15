import * as vscode from 'vscode';
import { LanguageClientOptions } from 'vscode-languageclient';
import { LanguageClient } from 'vscode-languageclient/browser';

declare const Worker: {
    new (stringUrl: string): any;
};

export function activate(context: vscode.ExtensionContext) {
    const serverMain = vscode.Uri.joinPath(context.extensionUri, 'dist/browser.server.js');
    try {
        const worker = new Worker(serverMain.toString());

        const clientOptions: LanguageClientOptions = {
            // Register the server for python source files.
            documentSelector: [
                {
                    scheme: 'file',
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
