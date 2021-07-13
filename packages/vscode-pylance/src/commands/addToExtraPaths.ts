import { Uri } from 'vscode';

import { ClientCommands, Commands } from 'pylance-internal/commands/commands';

import { AppConfiguration } from '../types/appConfig';
import { CommandManager } from '../types/commandManager';

export async function addToExtraPaths(
    appConfig: AppConfiguration,
    commandManager: CommandManager,
    filePath: string,
    toAdd: string
) {
    const config = appConfig.getConfiguration('python.analysis', Uri.file(filePath));
    const extraPaths = config.get('extraPaths');

    const newExtraPaths = Array.isArray(extraPaths) ? [...extraPaths] : [];
    newExtraPaths.push(toAdd);

    await config.update('extraPaths', newExtraPaths);

    await commandManager.executeCommand(Commands.executedClientCommand, ClientCommands.addToExtraPaths);
}
