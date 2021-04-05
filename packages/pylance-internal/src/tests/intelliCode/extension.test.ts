/*
 * modelLoader.test.ts
 *
 * IntelliCode model loader tests.
 */
import 'jest-extended';

import { anyString, anything, capture, instance, mock, verify } from 'ts-mockito';
import { CancellationToken } from 'vscode-languageserver';

import { CommandController } from '../../commands/commandController';
import { Commands, IntelliCodeCompletionCommandPrefix } from '../../commands/commands';
import { LogService } from '../../common/logger';
import { Platform } from '../../common/platform';
import { TelemetryEventName, TelemetryService } from '../../common/telemetry';
import { IntelliCodeCompletionListExtension } from '../../intelliCode/extension';
import { realZipOpener } from '../../intelliCode/zip';
import { getTestModel } from './testUtils';

const platform = new Platform();

let mockedLog: LogService;
let mockedTelemetry: TelemetryService;
let log: LogService;

describe('IntelliCode extension', () => {
    beforeEach(() => {
        mockedLog = mock<LogService>();
        mockedTelemetry = mock<TelemetryService>();

        log = instance(mockedLog);
    });

    test('disable', async () => {
        const ic = makeICExtension();
        await ic.updateSettings(false);

        verify(mockedTelemetry.sendTelemetry(anything())).never();
        verify(mockedTelemetry.sendExceptionTelemetry(anything(), anything())).never();
        verify(mockedLog.log(anything(), anyString())).never();
    });

    test('enable, no model', async () => {
        const ic = makeICExtension();
        await ic.updateSettings(true);

        verify(mockedTelemetry.sendTelemetry(anything())).never();
        verify(mockedTelemetry.sendExceptionTelemetry(anything(), anything())).never();
        verify(mockedLog.log(anything(), anyString())).never();
    });

    test('enable, with model', async () => {
        const ic = makeICExtension();
        await executeICCommand(ic, getTestModel());
        await ic.updateSettings(true);

        // Test model is not loadable into ONNX, so exception is expected.
        const [eventName, e] = capture(mockedTelemetry.sendExceptionTelemetry).first();
        expect(eventName).toEqual(TelemetryEventName.INTELLICODE_ONNX_LOAD_FAILED);
    });

    test('command prefix', async () => {
        const ic = makeICExtension();
        // Prefix is hardcoded here. If it changes, IntelliCode extension must be updated.
        expect(IntelliCodeCompletionCommandPrefix).toEqual('python.intellicode.');
        expect(ic.commandPrefix).toEqual('python.intellicode.');
    });

    test('command is supported', async () => {
        expect(CommandController.supportedCommands()).toContain(Commands.intelliCodeLoadExtension);
        expect(CommandController.supportedCommands()).toContain(Commands.intelliCodeCompletionItemCommand);
    });

    test('IC command loads model', async () => {
        const ic = makeICExtension();
        await executeICCommand(ic, getTestModel());

        expect(ic.model).toBeDefined();
    });

    function makeICExtension(): IntelliCodeCompletionListExtension {
        return new IntelliCodeCompletionListExtension(log, realZipOpener(), platform, instance(mockedTelemetry));
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
