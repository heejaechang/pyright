/* eslint-disable no-dupe-class-members */
import {
    CancellationToken,
    CancellationTokenSource,
    Disposable,
    MessageItem,
    MessageOptions,
    OutputChannel,
    Progress,
    ProgressOptions,
    StatusBarAlignment,
    StatusBarItem,
    window,
} from 'vscode';

import { ApplicationShell } from '../types/appShell';

export class ApplicationShellImpl implements ApplicationShell {
    public showInformationMessage(message: string, ...items: string[]): Thenable<string>;
    public showInformationMessage(message: string, options: MessageOptions, ...items: string[]): Thenable<string>;
    public showInformationMessage<T extends MessageItem>(message: string, ...items: T[]): Thenable<T>;
    public showInformationMessage<T extends MessageItem>(
        message: string,
        options: MessageOptions,
        ...items: T[]
    ): Thenable<T>;
    public showInformationMessage(message: string, options?: any, ...items: any[]): Thenable<any> {
        return window.showInformationMessage(message, options, ...items);
    }

    public showWarningMessage(message: string, ...items: string[]): Thenable<string>;
    public showWarningMessage(message: string, options: MessageOptions, ...items: string[]): Thenable<string>;
    public showWarningMessage<T extends MessageItem>(message: string, ...items: T[]): Thenable<T>;
    public showWarningMessage<T extends MessageItem>(
        message: string,
        options: MessageOptions,
        ...items: T[]
    ): Thenable<T>;
    public showWarningMessage(message: any, options?: any, ...items: any[]) {
        return window.showWarningMessage(message, options, ...items);
    }

    public showErrorMessage(message: string, ...items: string[]): Thenable<string>;
    public showErrorMessage(message: string, options: MessageOptions, ...items: string[]): Thenable<string>;
    public showErrorMessage<T extends MessageItem>(message: string, ...items: T[]): Thenable<T>;
    public showErrorMessage<T extends MessageItem>(
        message: string,
        options: MessageOptions,
        ...items: T[]
    ): Thenable<T>;
    public showErrorMessage(message: any, options?: any, ...items: any[]) {
        return window.showErrorMessage(message, options, ...items);
    }
    public setStatusBarMessage(text: string, hideAfterTimeout: number): Disposable;
    public setStatusBarMessage(text: string, hideWhenDone: Thenable<any>): Disposable;
    public setStatusBarMessage(text: string): Disposable;
    public setStatusBarMessage(text: string, arg?: any): Disposable {
        return window.setStatusBarMessage(text, arg);
    }

    public createStatusBarItem(alignment?: StatusBarAlignment, priority?: number): StatusBarItem {
        return window.createStatusBarItem(alignment, priority);
    }
    public withProgress<R>(
        options: ProgressOptions,
        task: (progress: Progress<{ message?: string; increment?: number }>, token: CancellationToken) => Thenable<R>
    ): Thenable<R> {
        return window.withProgress<R>(options, task);
    }
    public withProgressCustomIcon<R>(
        icon: string,
        task: (progress: Progress<{ message?: string; increment?: number }>, token: CancellationToken) => Thenable<R>
    ): Thenable<R> {
        const token = new CancellationTokenSource().token;
        const statusBarProgress = this.createStatusBarItem(StatusBarAlignment.Left);
        const progress = {
            report: (value: { message?: string; increment?: number }) => {
                statusBarProgress.text = `${icon} ${value.message}`;
            },
        };
        statusBarProgress.show();
        return task(progress, token).then((result) => {
            statusBarProgress.dispose();
            return result;
        });
    }
    public createOutputChannel(name: string): OutputChannel {
        return window.createOutputChannel(name);
    }
}
