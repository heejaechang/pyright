import { commands } from 'vscode';

export interface CommandManager {
    executeCommand(command: string, ...args: any[]): Promise<void>;
}

export class CommandManagerImpl implements CommandManager {
    async executeCommand(command: string, ...args: any[]): Promise<void> {
        await commands.executeCommand(command, args);
    }
}
