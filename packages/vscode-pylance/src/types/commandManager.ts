import { commands, Disposable } from 'vscode';

import { ClientCommands, Commands as ServerCommands } from 'pylance-internal/commands/commands';

export enum EditorCommand {
    ReloadWindow = 'workbench.action.reloadWindow',
    InstallExtension = 'workbench.extensions.installExtension',
    TriggerParameterHints = 'editor.action.triggerParameterHints',
}

export type ExecutableCommand = EditorCommand | ServerCommands | ClientCommands;

export interface CommandManager {
    executeCommand<T>(command: ExecutableCommand, ...rest: any[]): Thenable<T | undefined>;
    registerCommand(command: ClientCommands, callback: (...args: any[]) => any, thisArg?: any): Disposable;
}

export class CommandManagerImpl implements CommandManager {
    executeCommand<T>(command: ExecutableCommand, ...args: any[]): Thenable<T | undefined> {
        return commands.executeCommand(command, ...args);
    }

    registerCommand(command: ClientCommands, callback: (...args: any[]) => any, thisArg?: any): Disposable {
        return commands.registerCommand(command, callback, thisArg);
    }
}
