/*
 * modelLoader.test.ts
 *
 * IntelliCode model loader tests.
 */
import 'jest-extended';

import * as realFs from 'fs';
import * as path from 'path';
import { anyString, anything, instance, mock, verify } from 'ts-mockito';
import { CancellationToken } from 'vscode-languageserver';

import { IntelliCodeCompletionListExtension } from '../../../intelliCode/extension';
import { ModelFileName } from '../../../intelliCode/models';
import { createFromRealFileSystem, FileSystem } from '../../../pyright/server/src/common/fileSystem';
import { CommandController } from '../../commands/commandController';
import { Commands, IntelliCodeCompletionCommandPrefix } from '../../commands/commands';
import { LogService } from '../../common/logger';
import { Platform } from '../../common/platform';
import { TelemetryService } from '../../common/telemetry';
import { clientServerModelLocation, getTestModel } from './testUtils';

const platform = new Platform();
const modelUnpackFolder = path.resolve(path.join(__dirname, clientServerModelLocation));
const modelFile = path.join(modelUnpackFolder, ModelFileName);

let mockedFs: FileSystem;
let mockedLog: LogService;
let mockedTelemetry: TelemetryService;
let log: LogService;

describe('IntelliCode extension', () => {
    beforeEach(() => {
        mockedFs = mock<FileSystem>();
        mockedLog = mock<LogService>();
        mockedTelemetry = mock<TelemetryService>();

        log = instance(mockedLog);
    });

    test('disable', async () => {
        const ic = makeICExtension(createFromRealFileSystem(), modelUnpackFolder);
        deleteCachedModel();
        await ic.updateSettings(false);

        verify(mockedTelemetry.sendTelemetry(anything())).never();
        verify(mockedLog.log(anything(), anyString())).never();
        expect(realFs.existsSync(modelFile)).toBeFalse();
    });

    test('enable, no model', async () => {
        const ic = makeICExtension(createFromRealFileSystem(), modelUnpackFolder);
        deleteCachedModel();
        await ic.updateSettings(true);

        verify(mockedTelemetry.sendTelemetry(anything())).never();
        verify(mockedLog.log(anything(), anyString())).never();
        expect(realFs.existsSync(modelFile)).toBeFalse();
    });

    test('enable, with model', async () => {
        const ic = makeICExtension(createFromRealFileSystem(), modelUnpackFolder);
        deleteCachedModel();
        await executeICCommand(ic, getTestModel());
        await ic.updateSettings(true);

        verify(mockedTelemetry.sendTelemetry(anything())).never();
        expect(realFs.existsSync(modelFile)).toBeTrue();
    });

    test('command prefix', async () => {
        const ic = makeICExtension(instance(mockedFs), '');
        // Prefix is hardcoded here. If it changes, IntelliCode extension must be updated.
        expect(IntelliCodeCompletionCommandPrefix).toEqual('python.intellicode.');
        expect(ic.commandPrefix).toEqual('python.intellicode.');
    });

    test('command is supported', async () => {
        expect(CommandController.supportedCommands()).toContain(Commands.intelliCodeLoadExtension);
        expect(CommandController.supportedCommands()).toContain(Commands.intelliCodeCompletionItemCommand);
    });

    test('IC command loads model', async () => {
        const ic = makeICExtension(createFromRealFileSystem(), modelUnpackFolder);
        deleteCachedModel();
        await executeICCommand(ic, getTestModel());

        expect(ic.model).toBeDefined();
        expect(path.dirname(ic.model!.onnxModelPath)).toEqual(modelUnpackFolder);
        expect(path.basename(ic.model!.onnxModelPath)).toEqual(ModelFileName);
    });

    function makeICExtension(fs: FileSystem, modelUnpackFolder: string): IntelliCodeCompletionListExtension {
        return new IntelliCodeCompletionListExtension(log, fs, platform, instance(mockedTelemetry), modelUnpackFolder);
    }

    function deleteCachedModel(): void {
        if (realFs.existsSync(modelFile)) {
            realFs.unlinkSync(modelFile);
        }
    }

    async function executeICCommand(ic: IntelliCodeCompletionListExtension, modelPath: string): Promise<void> {
        const command = ic.executeCommand(
            Commands.intelliCodeLoadExtension,
            [{ modelPath: modelPath }],
            CancellationToken.None
        );
        expect(command).toBeDefined();
        await command;
    }
});
