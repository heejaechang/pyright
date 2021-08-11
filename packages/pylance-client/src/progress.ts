/*
 * progress.ts
 *
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Provides a way for the pyright language server to report progress
 * back to the client and display it in the editor.
 */

import { Progress, ProgressLocation, window } from 'vscode';
import { CommonLanguageClient, Disposable } from 'vscode-languageclient';

import { CustomLSP } from 'pylance-internal/customLSP';

const AnalysisTimeoutInMs = 60000;

export class ProgressReporting implements Disposable {
    private _progress: Progress<{ message?: string; increment?: number }> | undefined;
    private _progressTimeout: NodeJS.Timer | undefined;
    private _resolveProgress?: (value?: void | PromiseLike<void>) => void;

    constructor(languageClient: CommonLanguageClient) {
        languageClient.onReady().then(() => {
            languageClient.onNotification(CustomLSP.Notifications.BeginProgress, async () => {
                const progressPromise = new Promise<void>((resolve) => {
                    this._resolveProgress = resolve;
                });

                window.withProgress(
                    {
                        location: ProgressLocation.Window,
                        title: '',
                    },
                    (progress) => {
                        this._progress = progress;
                        return progressPromise;
                    }
                );

                this._primeTimeoutTimer();
            });

            languageClient.onNotification(CustomLSP.Notifications.ReportProgress, (message: string) => {
                if (this._progress) {
                    this._progress.report({ message });
                    this._primeTimeoutTimer();
                }
            });

            languageClient.onNotification(CustomLSP.Notifications.EndProgress, () => {
                this._clearProgress();
            });
        });
    }

    public dispose() {
        this._clearProgress();
    }

    private _clearProgress(): void {
        if (this._resolveProgress) {
            this._resolveProgress();
            this._resolveProgress = undefined;
        }

        if (this._progressTimeout) {
            clearTimeout(this._progressTimeout);
            this._progressTimeout = undefined;
        }
    }

    private _primeTimeoutTimer(): void {
        if (this._progressTimeout) {
            clearTimeout(this._progressTimeout);
            this._progressTimeout = undefined;
        }

        this._progressTimeout = setTimeout(() => this._handleTimeout(), AnalysisTimeoutInMs);
    }

    private _handleTimeout(): void {
        this._clearProgress();
    }
}
