/*
 * modelLoader.test.ts
 *
 * IntelliCode model loader tests.
 */
import 'jest-extended';

import * as realFs from 'fs';
import * as path from 'path';
import { DirResult, dirSync } from 'tmp';
import { anyString, anything, capture, instance, mock, verify } from 'ts-mockito';
import { CancellationToken } from 'vscode-languageserver';

import { createFromRealFileSystem, FileSystem } from 'pyright-internal/common/fileSystem';

import { CommandController } from '../../commands/commandController';
import { Commands, IntelliCodeCompletionCommandPrefix } from '../../commands/commands';
import { LogService } from '../../common/logger';
import { Platform } from '../../common/platform';
import { TelemetryEventName, TelemetryService } from '../../common/telemetry';
import { IntelliCodeCompletionListExtension } from '../../intelliCode/extension';
import { ModelFileName } from '../../intelliCode/models';
import { getTestModel } from './testUtils';

const platform = new Platform();

let mockedFs: FileSystem;
let mockedLog: LogService;
let mockedTelemetry: TelemetryService;
let log: LogService;
let modelUnpackFolderTmp: DirResult;
let modelUnpackFolder: string;
let modelFile: string;

describe('IntelliCode extension', () => {
    beforeEach(() => {
        mockedFs = mock<FileSystem>();
        mockedLog = mock<LogService>();
        mockedTelemetry = mock<TelemetryService>();

        log = instance(mockedLog);

        modelUnpackFolderTmp = dirSync({
            unsafeCleanup: true,
        });

        modelUnpackFolder = modelUnpackFolderTmp.name;
        modelFile = path.join(modelUnpackFolder, ModelFileName);
    });

    afterEach(() => {
        modelUnpackFolderTmp.removeCallback();
    });

    test('disable', async () => {
        const ic = makeICExtension(createFromRealFileSystem(), modelUnpackFolder);
        deleteCachedModel();
        await ic.updateSettings(false);

        verify(mockedTelemetry.sendTelemetry(anything())).never();
        verify(mockedTelemetry.sendExceptionTelemetry(anything(), anything())).never();
        verify(mockedLog.log(anything(), anyString())).never();
        expect(realFs.existsSync(modelFile)).toBeFalse();
    });

    test('enable, no model', async () => {
        const ic = makeICExtension(createFromRealFileSystem(), modelUnpackFolder);
        deleteCachedModel();
        await ic.updateSettings(true);

        verify(mockedTelemetry.sendTelemetry(anything())).never();
        verify(mockedTelemetry.sendExceptionTelemetry(anything(), anything())).never();
        verify(mockedLog.log(anything(), anyString())).never();
        expect(realFs.existsSync(modelFile)).toBeFalse();
    });

    test('enable, with model', async () => {
        const ic = makeICExtension(createFromRealFileSystem(), modelUnpackFolder);
        deleteCachedModel();
        await executeICCommand(ic, getTestModel());
        await ic.updateSettings(true);

        expect(realFs.existsSync(modelFile)).toBeTrue();

        // Test model is not loadable into ONNX, so exception is expected.
        const [eventName, e] = capture(mockedTelemetry.sendExceptionTelemetry).first();
        expect(eventName).toEqual(TelemetryEventName.INTELLICODE_ONNX_LOAD_FAILED);
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
