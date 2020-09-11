/*
 * modelLoader.test.ts
 *
 * IntelliCode model loader tests.
 */

import 'jest-extended';

import * as realFs from 'fs';
import * as path from 'path';
import { dirSync } from 'tmp';
import { anyString, anything, capture, instance, mock, verify, when } from 'ts-mockito';

import { LogLevel } from 'pyright-internal/common/console';
import { createFromRealFileSystem, FileSystem } from 'pyright-internal/common/fileSystem';

import { LogService } from '../../common/logger';
import { formatEventName, TelemetryEventName, TelemetryService } from '../../common/telemetry';
import { ModelLoader } from '../../intelliCode/modelLoader';
import {
    IntelliCodeFolderName,
    ModelFileName,
    ModelMetaDataFileName,
    ModelSubFolder,
    ModelTokensFileName,
} from '../../intelliCode/models';
import { getZip, Zip } from '../../intelliCode/zip';
import { getTestModel } from './testUtils';

let mockedFs: FileSystem;
let mockedLog: LogService;
let log: LogService;
let mockedTelemetry: TelemetryService;
let telemetry: TelemetryService;

const modelFolder = 'modelFolder';
const intelliCodeFolder = path.join(modelFolder, IntelliCodeFolderName);

describe('IntelliCode model loader', () => {
    beforeEach(() => {
        mockedFs = mock<FileSystem>();
        mockedLog = mock<LogService>();
        log = instance(mockedLog);
        mockedTelemetry = mock<TelemetryService>();
        telemetry = instance(mockedTelemetry);
    });

    test('unpack model', async () => {
        const tmpFolder = dirSync({
            unsafeCleanup: true,
        });

        try {
            // Copy model zip to a temp folder elsewhere
            const modelZipPath = getTestModel();
            const icFolder = path.join(tmpFolder.name, ModelSubFolder);

            const vfs = createFromRealFileSystem();
            const ml = new ModelLoader(vfs, getZip(vfs), log, telemetry);
            const m = await ml.loadModel(modelZipPath, icFolder);

            expect(m).toBeDefined();
            expect(m!.metaData.LicenseTerm.length).toBeGreaterThan(0);
            expect(m!.metaData.ModelName).toEqual('Python_$base$');
            expect(m!.metaData.Version).toEqual('0.0.1');

            expect(m!.tokens.length).toEqual(5);
            expect(m!.tokens[0]).toEqual('padding_token');

            expect(realFs.existsSync(path.join(icFolder, ModelFileName))).toBeTrue();
            verify(mockedTelemetry.sendTelemetry(anything())).never();
        } finally {
            tmpFolder.removeCallback();
        }
    });

    const defaultErrorName = 'Error name';
    const defaultErrorMessage = 'Error message';

    function makeError(): Error {
        const error = new Error(defaultErrorMessage);
        error.name = defaultErrorName;
        return error;
    }

    test('no unpack on existing model', async () => {
        const metadataFile = path.join(intelliCodeFolder, ModelMetaDataFileName);
        const tokensFile = path.join(intelliCodeFolder, ModelTokensFileName);
        const modelFile = path.join(intelliCodeFolder, ModelFileName);

        when(mockedFs.existsSync(metadataFile)).thenReturn(true);
        when(mockedFs.existsSync(tokensFile)).thenReturn(true);
        when(mockedFs.readdirSync(intelliCodeFolder)).thenReturn([modelFile]);
        const fs = instance(mockedFs);

        const mockedZip = mock<Zip>();
        const ml = new ModelLoader(fs, instance(mockedZip), log, telemetry);
        await ml.loadModel(getTestModel(), intelliCodeFolder);

        verify(mockedFs.existsSync(metadataFile)).once();
        verify(mockedFs.existsSync(tokensFile)).once();
        verify(mockedFs.readdirSync(intelliCodeFolder)).once();
    });

    test('failed to unpack model', async () => {
        const mockedZip = mock<Zip>();

        when(mockedZip.unzip(anyString(), anyString())).thenThrow(makeError());
        const ml = new ModelLoader(instance(mockedFs), instance(mockedZip), log, telemetry);
        await ml.loadModel(getTestModel(), modelFolder);

        verifyErrorLog('Unable to unpack');
    });

    test('no files in folder', async () => {
        when(mockedFs.readdirSync(anyString())).thenReturn([]);
        await verifyLogOnError(instance(mockedFs), 'Unable to find', true);
    });

    test('unable to read JSON', async () => {
        when(mockedFs.readFileText(anyString(), anyString())).thenThrow(makeError());
        when(mockedFs.readdirSync(anyString())).thenReturn(['1.onnx']);

        await verifyLogOnError(instance(mockedFs), 'Unable to read');
    });

    test('unable to parse JSON', async () => {
        when(mockedFs.readFileText(anyString(), anyString())).thenReturn(Promise.resolve('***'));
        when(mockedFs.readdirSync(anyString())).thenReturn(['1.onnx']);

        await verifyLogOnError(instance(mockedFs), 'Unable to parse', false, 'SyntaxError');
    });

    async function verifyLogOnError(
        fs: FileSystem,
        message: string,
        skipException = false,
        expectedErrorName?: string
    ): Promise<void> {
        const mockedZip = mock<Zip>();
        when(mockedZip.unzip(anyString(), anyString())).thenReturn(Promise.resolve(3));

        const ml = new ModelLoader(fs, instance(mockedZip), log, telemetry);
        await ml.loadModel(getTestModel(), modelFolder);
        verifyErrorLog(message, skipException, expectedErrorName);
    }

    function verifyErrorLog(message: string, skipException = false, expectedErrorName?: string): void {
        verify(mockedLog.log(LogLevel.Error, anyString())).once();

        const callArgs = capture(mockedLog.log).first();
        expect(callArgs[0]).toEqual(LogLevel.Error);
        expect(callArgs[1]).toStartWith(message);

        if (!skipException) {
            const [eventName, e] = capture(mockedTelemetry.sendExceptionTelemetry).first();
            expect(eventName).toEqual(TelemetryEventName.INTELLICODE_MODEL_LOAD_FAILED);
            expect(e).toBeDefined();
            expectedErrorName = expectedErrorName ?? defaultErrorName;
            expect(e.name).toEqual(expectedErrorName);
        }
    }
});
