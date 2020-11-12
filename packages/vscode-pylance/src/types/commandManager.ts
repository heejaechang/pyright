import { commands, Disposable } from 'vscode';

export enum Command {
    ReloadWindow = 'workbench.action.reloadWindow',
    InstallExtension = 'workbench.extensions.installExtension',
    TriggerParameterHints = 'editor.action.triggerParameterHints',
}

export interface CommandManager {
    executeCommand<T>(command: Command, ...rest: any[]): Thenable<T | undefined>;
    registerCommand(command: string, callback: (...args: any[]) => any, thisArg?: any): Disposable;
}

export class CommandManagerImpl implements CommandManager {
    executeCommand<T>(command: Command, ...args: any[]): Thenable<T | undefined> {
        return commands.executeCommand(command, ...args);
    }

    registerCommand(command: string, callback: (...args: any[]) => any, thisArg?: any): Disposable {
        return commands.registerCommand(command, callback, thisArg);
    }
}
