import * as path from 'path';
import { anything, deepEqual, instance, mock, verify, when } from 'ts-mockito';
import { Uri, WorkspaceConfiguration } from 'vscode';

import { ClientCommands, Commands } from 'pylance-internal/commands/commands';

import { addToExtraPaths } from '../commands/addToExtraPaths';
import { AppConfiguration } from '../types/appConfig';
import { CommandManager } from '../types/commandManager';

describe('addExtraPaths', () => {
    let appConfig: AppConfiguration;
    let workspaceConfig: WorkspaceConfiguration;
    let commandManager: CommandManager;

    beforeEach(() => {
        appConfig = mock();
        workspaceConfig = mock();
        commandManager = mock();
    });

    const filePath = path.resolve('main.py');
    const fileURI = Uri.file(filePath);
    const toAdd = './foobar';

    test('No extraPaths', async () => {
        when(appConfig.getConfiguration('python.analysis', deepEqual(fileURI))).thenReturn(instance(workspaceConfig));
        when(workspaceConfig.get<unknown>('extraPaths')).thenReturn(undefined);

        await addToExtraPaths(instance(appConfig), instance(commandManager), filePath, toAdd);

        verify(appConfig.getConfiguration('python.analysis', anything())).once();
        verify(workspaceConfig.update('extraPaths', deepEqual([toAdd]))).once();
        verify(commandManager.executeCommand(Commands.executedClientCommand, ClientCommands.addToExtraPaths)).once();
    });

    test('Append to extraPaths', async () => {
        when(appConfig.getConfiguration('python.analysis', deepEqual(fileURI))).thenReturn(instance(workspaceConfig));
        when(workspaceConfig.get<unknown>('extraPaths')).thenReturn(['./xyz']);

        await addToExtraPaths(instance(appConfig), instance(commandManager), filePath, toAdd);

        verify(appConfig.getConfiguration('python.analysis', anything())).once();
        verify(workspaceConfig.update('extraPaths', deepEqual(['./xyz', toAdd]))).once();
        verify(commandManager.executeCommand(Commands.executedClientCommand, ClientCommands.addToExtraPaths)).once();
    });

    test('Replace bad value', async () => {
        when(appConfig.getConfiguration('python.analysis', deepEqual(fileURI))).thenReturn(instance(workspaceConfig));
        when(workspaceConfig.get<unknown>('extraPaths')).thenReturn('not an array');

        await addToExtraPaths(instance(appConfig), instance(commandManager), filePath, toAdd);

        verify(appConfig.getConfiguration('python.analysis', anything())).once();
        verify(workspaceConfig.update('extraPaths', deepEqual([toAdd]))).once();
        verify(commandManager.executeCommand(Commands.executedClientCommand, ClientCommands.addToExtraPaths)).once();
    });
});
