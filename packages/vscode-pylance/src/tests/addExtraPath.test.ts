import * as path from 'path';
import { anything, deepEqual, instance, mock, verify, when } from 'ts-mockito';
import { Uri, WorkspaceConfiguration } from 'vscode';

import { addToExtraPaths } from '../commands/addToExtraPaths';
import { AppConfiguration } from '../types/appConfig';

describe('addExtraPaths', () => {
    let appConfig: AppConfiguration;
    let workspaceConfig: WorkspaceConfiguration;

    beforeEach(() => {
        appConfig = mock();
        workspaceConfig = mock();
    });

    const filePath = path.resolve('main.py');
    const fileURI = Uri.file(filePath);
    const toAdd = './foobar';

    test('No extraPaths', async () => {
        when(appConfig.getConfiguration('python.analysis', deepEqual(fileURI))).thenReturn(instance(workspaceConfig));
        when(workspaceConfig.get<unknown>('extraPaths')).thenReturn(undefined);

        await addToExtraPaths(instance(appConfig), filePath, toAdd);

        verify(appConfig.getConfiguration('python.analysis', anything())).once();
        verify(workspaceConfig.update('extraPaths', deepEqual([toAdd]))).once();
    });

    test('Append to extraPaths', async () => {
        when(appConfig.getConfiguration('python.analysis', deepEqual(fileURI))).thenReturn(instance(workspaceConfig));
        when(workspaceConfig.get<unknown>('extraPaths')).thenReturn(['./xyz']);

        await addToExtraPaths(instance(appConfig), filePath, toAdd);

        verify(appConfig.getConfiguration('python.analysis', anything())).once();
        verify(workspaceConfig.update('extraPaths', deepEqual(['./xyz', toAdd]))).once();
    });

    test('Replace bad value', async () => {
        when(appConfig.getConfiguration('python.analysis', deepEqual(fileURI))).thenReturn(instance(workspaceConfig));
        when(workspaceConfig.get<unknown>('extraPaths')).thenReturn('not an array');

        await addToExtraPaths(instance(appConfig), filePath, toAdd);

        verify(appConfig.getConfiguration('python.analysis', anything())).once();
        verify(workspaceConfig.update('extraPaths', deepEqual([toAdd]))).once();
    });
});
