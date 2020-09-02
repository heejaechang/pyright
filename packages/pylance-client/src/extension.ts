/*
 * extension.ts
 *
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Provides client for Pylance Python language server. This portion runs
 * in the context of the VS Code process and talks to the server, which
 * runs in another process. FOR DEBUGGING ONLY.
 */

import * as path from 'path';
import * as vscode from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient/node';

import { Commands } from 'pylance-internal/commands/commands';

import { FileBasedCancellationStrategy } from './cancellationUtils';
import { ProgressReporting } from './progress';

let cancellationStrategy: FileBasedCancellationStrategy | undefined;

export function activate(context: vscode.ExtensionContext) {
    registerCommand(context, Commands.runCommands, (...args: vscode.Command[]) => {
        args.forEach((c) => {
            vscode.commands.executeCommand(c.command, ...(c.arguments ?? []));
        });
    });

    registerCommand(context, Commands.triggerParameterHints, (scope: string) => {
        const hintsEnabled = vscode.workspace.getConfiguration('editor.parameterHints', {
            uri: vscode.Uri.parse(scope),
            languageId: 'python',
        });

        if (hintsEnabled.get<boolean | undefined>('enabled')) {
            vscode.commands.executeCommand('editor.action.triggerParameterHints');
        }
    });

    cancellationStrategy = new FileBasedCancellationStrategy();

    const nonBundlePath = context.asAbsolutePath(path.join('dist', 'server.js'));
    const debugOptions = { execArgv: ['--nolazy', '--inspect=6600'] };

    // If the extension is launched in debug mode, then the debug server options are used.
    const serverOptions: ServerOptions = {
        run: {
            module: nonBundlePath,
            transport: TransportKind.ipc,
            args: cancellationStrategy.getCommandLineArguments(),
        },
        debug: {
            module: nonBundlePath,
            transport: TransportKind.ipc,
            args: cancellationStrategy.getCommandLineArguments(),
            options: debugOptions,
        },
    };

    // Options to control the language client
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
        connectionOptions: { cancellationStrategy: cancellationStrategy },
    };

    // Create the language client and start the client.
    const languageClient = new LanguageClient('python', 'Pylance', serverOptions, clientOptions);
    const disposable = languageClient.start();

    // Push the disposable to the context's subscriptions so that the
    // client can be deactivated on extension deactivation.
    context.subscriptions.push(disposable);

    // Allocate a progress reporting object.
    const progressReporting = new ProgressReporting(languageClient);
    context.subscriptions.push(progressReporting);

    languageClient.onTelemetry((eventInfo) => {
        console.log(`onTelemetry EventName: ${eventInfo.EventName}`);

        for (const [prop, value] of Object.entries(eventInfo.Properties)) {
            console.log(`               Property: ${prop} : ${value}`);
        }

        for (const [measure, value] of Object.entries(eventInfo.Measurements)) {
            console.log(`               Measurement: ${measure} : ${value}`);
        }
    });
}

export function deactivate() {
    if (cancellationStrategy) {
        cancellationStrategy.dispose();
        cancellationStrategy = undefined;
    }

    // Return undefined rather than a promise to indicate
    // that deactivation is done synchronously. We don't have
    // anything to do here.
    return undefined;
}

function registerCommand(
    context: vscode.ExtensionContext,
    command: string,
    callback: (...args: any[]) => any,
    thisArg?: any
) {
    context.subscriptions.push(vscode.commands.registerCommand(command, callback, thisArg));
}
