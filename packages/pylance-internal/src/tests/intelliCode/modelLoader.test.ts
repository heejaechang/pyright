/*
 * modelLoader.test.ts
 *
 * IntelliCode model loader tests.
 */

import 'jest-extended';

import { anyString, anything, capture, instance, mock, spy, verify, when } from 'ts-mockito';

import { LogLevel } from 'pyright-internal/common/console';

import { LogService } from '../../common/logger';
import { TelemetryEventName, TelemetryService } from '../../common/telemetry';
import { ModelLoader } from '../../intelliCode/modelLoader';
import { ModelFileName, ModelMetaDataFileName, ModelTokensFileName } from '../../intelliCode/models';
import { realZipOpener, ZipFile, ZipOpener } from '../../intelliCode/zip';
import { getTestModel } from './testUtils';

let mockedZipOpener: ZipOpener;
let zipOpener: ZipOpener;
let mockedZipFile: ZipFile;
let zipFile: ZipFile;
let mockedLog: LogService;
let log: LogService;
let mockedTelemetry: TelemetryService;
let telemetry: TelemetryService;

const modelZipPath = getTestModel();

describe('IntelliCode model loader', () => {
    beforeEach(() => {
        mockedZipOpener = mock<ZipOpener>();
        zipOpener = instance(mockedZipOpener);
        mockedZipFile = mock<ZipFile>();
        zipFile = instance(mockedZipFile);
        when(mockedZipOpener.open(modelZipPath)).thenReturn(zipFile);

        mockedLog = mock<LogService>();
        log = instance(mockedLog);
        mockedTelemetry = mock<TelemetryService>();
        telemetry = instance(mockedTelemetry);
    });

    test('load model', async () => {
        const realZipFile = realZipOpener().open(modelZipPath);

        when(mockedZipFile.entryData(anyString())).thenCall((entry) => realZipFile.entryData(entry));
        when(mockedZipFile.close()).thenCall(() => realZipFile.close());

        const ml = new ModelLoader(zipOpener, log, telemetry);
        const m = await ml.loadModel(modelZipPath);

        expect(m).toBeDefined();
        expect(m!.metaData.LicenseTerm.length).toBeGreaterThan(0);
        expect(m!.metaData.ModelName).toEqual('Python_$base$');
        expect(m!.metaData.Version).toEqual('0.0.1');

        expect(m!.tokens.length).toEqual(5);
        expect(m!.tokens[0]).toEqual('padding_token');

        verify(mockedTelemetry.sendTelemetry(anything())).never();
        verify(mockedZipFile.close()).once();
    });

    const defaultErrorName = 'Error name';
    const defaultErrorMessage = 'Error message';

    function makeError(): Error {
        const error = new Error(defaultErrorMessage);
        error.name = defaultErrorName;
        return error;
    }

    test('failed to unpack model', async () => {
        when(mockedZipOpener.open(anyString())).thenThrow(makeError());

        const ml = new ModelLoader(zipOpener, log, telemetry);
        await ml.loadModel(modelZipPath);

        verifyErrorLog('Unable to open model zip');
    });

    [ModelFileName, ModelMetaDataFileName, ModelTokensFileName].forEach((badFile) => {
        test(`missing ${badFile} in zip`, async () => {
            const realZipFile = realZipOpener().open(modelZipPath);

            when(mockedZipFile.entryData(anyString())).thenCall((entry) => {
                if (entry === badFile) {
                    throw makeError();
                }
                return realZipFile.entryData(entry);
            });
            when(mockedZipFile.close()).thenCall(() => realZipFile.close());

            await verifyLogOnError('Unable to read', true);
        });
    });

    [ModelMetaDataFileName, ModelTokensFileName].forEach((badFile) => {
        test(`invalid syntax in ${badFile}`, async () => {
            const realZipFile = realZipOpener().open(modelZipPath);

            when(mockedZipFile.entryData(anyString())).thenCall((entry) => {
                if (entry === badFile) {
                    return Buffer.from('***');
                }
                return realZipFile.entryData(entry);
            });
            when(mockedZipFile.close()).thenCall(() => realZipFile.close());

            await verifyLogOnError('Unable to parse', false, 'SyntaxError');
        });
    });

    async function verifyLogOnError(message: string, skipException = false, expectedErrorName?: string): Promise<void> {
        const ml = new ModelLoader(zipOpener, log, telemetry);
        await ml.loadModel(modelZipPath);
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
