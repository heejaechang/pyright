/*
 * modelLoader.test.ts
 *
 * IntelliCode model loader tests.
 */
import 'jest-extended';

import * as realFs from 'fs';
import * as path from 'path';
import { anyString, anything, instance, mock, verify, when } from 'ts-mockito';

import { IntelliCodeCompletionListExtension } from '../../../intelliCode/extension';
import { ModelZipAcquisionServiceImpl } from '../../../intelliCode/modelAcquisitionService';
import { ModelFileName, ModelZipAcquisitionService } from '../../../intelliCode/models';
import { createFromRealFileSystem, FileSystem } from '../../../pyright/server/src/common/fileSystem';
import { LogService } from '../../common/logger';
import { Platform } from '../../common/platform';
import { TelemetryService } from '../../common/telemetry';
import { clientServerModelLocation, verifyErrorLog } from './testUtils';

const platform = new Platform();

let mockedFs: FileSystem;
let mockedLog: LogService;
let mockedTelemetry: TelemetryService;
let log: LogService;
let mas: ModelZipAcquisitionService;

describe('IntelliCode extension', () => {
    beforeEach(() => {
        mockedFs = mock<FileSystem>();
        mockedLog = mock<LogService>();
        mockedTelemetry = mock<TelemetryService>();
        mas = mock<ModelZipAcquisitionService>();

        log = instance(mockedLog);
    });

    test('disable', async () => {
        const ic = new IntelliCodeCompletionListExtension(
            log,
            instance(mockedFs),
            platform,
            instance(mockedTelemetry),
            instance(mas),
            ''
        );
        await ic.updateSettings(false);
        // There should not be any exceptions even that fs is just a mock.
        verify(mockedTelemetry.sendTelemetry(anything())).never();
        verify(mockedLog.log(anything(), anyString())).never();
    });

    const testModelDownloadFailedName = 'enable, failed to download model';
    if (platform.isOnnxSupported()) {
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
        const ic = new IntelliCodeCompletionListExtension(
            log,
            instance(mockedFs),
            platform,
            instance(mockedTelemetry),
            instance(mas),
            ''
        );
        await ic.updateSettings(true);

        // Should log errors since we didn't provide model zip.
        verifyErrorLog(mockedLog, 'Failed to download', 2);
    }

    const testEnableIntelliCodeExtensionName = 'enable';
    if (platform.isOnnxSupported()) {
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
        const ic = new IntelliCodeCompletionListExtension(
            log,
            vfs,
            platform,
            instance(mockedTelemetry),
            mas,
            modelUnpackFolder
        );
        await ic.updateSettings(true);

        verify(mockedTelemetry.sendTelemetry(anything())).never();
        expect(realFs.existsSync(path.join(modelUnpackFolder, ModelFileName))).toBeTrue();
    }
});
