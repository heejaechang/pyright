/*
 * modelLoader.test.ts
 *
 * IntelliCode model loader tests.
 */

import 'jest-extended';

import * as realFs from 'fs';
import * as path from 'path';
import { anyString, anything, instance, mock, verify, when } from 'ts-mockito';

import { isOnnxSupported } from '../../../intelliCode/deepLearning';
import { IntelliCodeCompletionListExtension } from '../../../intelliCode/extension';
import { ModelZipAcquisionServiceImpl } from '../../../intelliCode/modelAcquisitionService';
import { ModelFileName, ModelZipAcquisitionService } from '../../../intelliCode/models';
import { createFromRealFileSystem, FileSystem } from '../../../pyright/server/src/common/fileSystem';
import { LogService } from '../../common/logger';
import { TelemetryService } from '../../common/telemetry';
import { clientServerModelLocation, verifyErrorLog, verifyErrorTelemetry } from './testUtils';

let mockedFs: FileSystem;
let mockedLog: LogService;
let mockedTelemetry: TelemetryService;
let log: LogService;
let telemetry: TelemetryService;
let mas: ModelZipAcquisitionService;

describe('IntelliCode extension', () => {
    beforeEach(() => {
        mockedFs = mock<FileSystem>();
        mockedLog = mock<LogService>();
        mockedTelemetry = mock<TelemetryService>();
        mas = mock<ModelZipAcquisitionService>();

        log = instance(mockedLog);
        telemetry = instance(mockedTelemetry);
    });

    test('disable', async () => {
        const ic = new IntelliCodeCompletionListExtension(log, telemetry, instance(mockedFs), instance(mas), '');
        await ic.enable(false);
        // There should not be any exceptions even that fs is just a mock.
        verify(mockedTelemetry.sendTelemetry(anything())).never();
        verify(mockedLog.log(anything(), anyString())).never();
    });

    const testModelDownloadFailedName = 'enable, failed to download model';
    if (isOnnxSupported()) {
        test(testModelDownloadFailedName, async () => {
            await testModelDownloadFailed();
        });
    } else {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        test.skip(testModelDownloadFailedName, () => {});
    }

    async function testModelDownloadFailed(): Promise<void> {
        when(mas.getModel()).thenReject({
            name: 'Error',
            message: 'Failed to download',
        });

        when(mockedFs.getModulePath()).thenReturn('irrelevant');
        const ic = new IntelliCodeCompletionListExtension(log, telemetry, instance(mockedFs), instance(mas), '');
        await ic.enable(true);

        // Should log errors since we didn't provide model zip.
        verifyErrorLog(mockedLog, 'Failed to download', 2);
        verifyErrorTelemetry(mockedTelemetry);
    }

    const testEnableIntelliCodeExtensionName = 'enable';
    if (isOnnxSupported()) {
        test(
            testEnableIntelliCodeExtensionName,
            async () => {
                await testEnableIntelliCodeExtension();
            },
            60000 // Long timeout since model has to be downloaded.
        );
    } else {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        test.skip(testEnableIntelliCodeExtensionName, () => {});
    }

    async function testEnableIntelliCodeExtension() {
        const vfs = createFromRealFileSystem();
        const mas = new ModelZipAcquisionServiceImpl(vfs);

        const modelUnpackFolder = path.join(__dirname, clientServerModelLocation);
        const ic = new IntelliCodeCompletionListExtension(log, telemetry, vfs, mas, modelUnpackFolder);
        await ic.enable(true);

        verify(mockedTelemetry.sendTelemetry(anything())).never();
        expect(realFs.existsSync(path.join(modelUnpackFolder, ModelFileName))).toBeTrue();
    }
});
