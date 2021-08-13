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
import { LanguageClient, LanguageClientOptions, ServerOptions, State, TransportKind } from 'vscode-languageclient/node';

import { ClientCommands, Commands } from 'pylance-internal/commands/commands';
import { CustomLSP } from 'pylance-internal/customLSP';

import { FileBasedCancellationStrategy } from './cancellationUtils';
import { ProgressReporting } from './progress';

let cancellationStrategy: FileBasedCancellationStrategy | undefined;

export function activate(context: vscode.ExtensionContext) {
    registerCommand(context, ClientCommands.runCommands, (...args: vscode.Command[]) => {
        args.forEach((c) => {
            vscode.commands.executeCommand(c.command, ...(c.arguments ?? []));
        });
    });

    registerCommand(context, ClientCommands.triggerParameterHints, (scope: string) => {
        const hintsEnabled = vscode.workspace.getConfiguration('editor.parameterHints', {
            uri: vscode.Uri.parse(scope),
            languageId: 'python',
        });

        if (hintsEnabled.get<boolean | undefined>('enabled')) {
            vscode.commands.executeCommand('editor.action.triggerParameterHints');
        }
    });

    registerCommand(context, 'pylance.dumpTokens', () => {
        const fileName = vscode.window.activeTextEditor?.document.fileName;
        if (fileName) {
            vscode.commands.executeCommand(Commands.dumpFileDebugInfo, fileName, 'tokens');
        }
    });

    registerCommand(context, 'pylance.dumpNodes', () => {
        const fileName = vscode.window.activeTextEditor?.document.fileName;
        if (fileName) {
            vscode.commands.executeCommand(Commands.dumpFileDebugInfo, fileName, 'nodes');
        }
    });

    registerCommand(context, 'pylance.dumpTypes', () => {
        const fileName = vscode.window.activeTextEditor?.document.fileName;
        if (fileName) {
            const start = vscode.window.activeTextEditor!.selection.start;
            const end = vscode.window.activeTextEditor!.selection.end;
            const startOffset = vscode.window.activeTextEditor!.document.offsetAt(start);
            const endOffset = vscode.window.activeTextEditor!.document.offsetAt(end);
            vscode.commands.executeCommand(Commands.dumpFileDebugInfo, fileName, 'types', startOffset, endOffset);
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
                language: 'python',
            },
        ],
        synchronize: {
            // Synchronize the setting section to the server.
            configurationSection: ['python', 'pyright'],
        },
        connectionOptions: { cancellationStrategy: cancellationStrategy },
        initializationOptions: {
            trustedWorkspaceSupport: true,
        },
    };

    // Create the language client and start the client.
    const languageClient = new LanguageClient('python', 'Pylance', serverOptions, clientOptions);

    // Allocate a progress reporting object.
    const progressReporting = new ProgressReporting(languageClient);
    context.subscriptions.push(progressReporting);

    context.subscriptions.push(
        languageClient.onDidChangeState((e) => {
            // The client's on* methods must be called after the client has started, but if called too
            // late the server may have already sent a message (which leads to failures). Register
            // these on the state change to running to ensure they are ready soon enough.
            if (e.newState !== State.Running) {
                return;
            }

            // For now, Ignore case where client is stopped and re-started.
            context.subscriptions.push(
                languageClient.onTelemetry((eventInfo) => {
                    console.log(`onTelemetry EventName: ${eventInfo.EventName}`);

                    for (const [prop, value] of Object.entries(eventInfo.Properties)) {
                        console.log(`               Property: ${prop} : ${value}`);
                    }

                    for (const [measure, value] of Object.entries(eventInfo.Measurements)) {
                        console.log(`               Measurement: ${measure} : ${value}`);
                    }
                })
            );

            context.subscriptions.push(
                languageClient.onRequest(CustomLSP.Requests.IsTrustedWorkspace, async () => {
                    return {
                        isTrusted: vscode.workspace.isTrusted,
                    };
                })
            );
        })
    );

    context.subscriptions.push(
        vscode.workspace.onDidGrantWorkspaceTrust(() => {
            languageClient.onReady().then(() => {
                languageClient.sendNotification(CustomLSP.Notifications.WorkspaceTrusted, { isTrusted: true });
            });
        })
    );

    // Start the client once everything has set up.
    const disposable = languageClient.start();

    // Push the disposable to the context's subscriptions so that the
    // client can be deactivated on extension deactivation.
    context.subscriptions.push(disposable);
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
