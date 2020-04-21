/*
 * modelLoader.test.ts
 *
 * IntelliCode model loader tests.
 */

import 'jest-extended';

import * as realFs from 'fs';
import * as path from 'path';
import { dirSync } from 'tmp';
import { anyString, anything, instance, mock, verify, when } from 'ts-mockito';

import { IntelliCodeCompletionListExtension } from '../../../intelliCode/extension';
import { createFromRealFileSystem, FileSystem } from '../../../pyright/server/src/common/fileSystem';
import { LogService } from '../../common/logger';
import { TelemetryService } from '../../common/telemetry';
import { prepareTestModel, verifyErrorLog, verifyErrorTelemetry } from './testUtils';

let mockedFs: FileSystem;
let mockedLog: LogService;
let mockedTelemetry: TelemetryService;
let log: LogService;
let telemetry: TelemetryService;

beforeEach(() => {
    mockedFs = mock<FileSystem>();
    mockedLog = mock<LogService>();
    mockedTelemetry = mock<TelemetryService>();
    log = instance(mockedLog);
    telemetry = instance(mockedTelemetry);
});

test('IntelliCode extension: disable', async () => {
    const ic = new IntelliCodeCompletionListExtension(log, telemetry, instance(mockedFs));
    await ic.enable(false);
    // There should not be any exceptions even that fs is just a mock.
    verify(mockedTelemetry.sendTelemetry(anything())).never();
    verify(mockedLog.log(anything(), anyString())).never();
});

test('IntelliCode extension: enable, failed to download model', async () => {
    const tmpFolder = dirSync();
    try {
        when(mockedFs.getModulePath()).thenReturn(tmpFolder.name);
        const ic = new IntelliCodeCompletionListExtension(log, telemetry, instance(mockedFs));
        await ic.enable(true);
        // Should log errors since we didn't provide model zip.
        verifyErrorLog(mockedLog, 'Unable to unpack');
        verifyErrorTelemetry(mockedTelemetry);
    } finally {
        tmpFolder.removeCallback();
    }
});

test('IntelliCode extension: enable', async () => {
    const tmpFolder = dirSync();
    try {
        prepareTestModel(tmpFolder.name);
        const vfs = createFromRealFileSystem();

        when(mockedFs.getModulePath()).thenReturn(tmpFolder.name);
        when(mockedFs.createWriteStream(anyString())).thenCall((arg1: string) => {
            return vfs.createWriteStream(arg1);
        });
        when(mockedFs.readdirSync(anyString())).thenCall((arg1: string) => {
            return vfs.readdirSync(arg1);
        });

        const ic = new IntelliCodeCompletionListExtension(log, telemetry, instance(mockedFs));
        await ic.enable(true);

        verify(mockedTelemetry.sendTelemetry(anything())).never();
        verify(mockedLog.log(anything(), anyString())).never();

        const icFolder = path.join(tmpFolder.name, 'IntelliCode');
        expect(realFs.existsSync(path.join(icFolder, 'model.onnx'))).toBeTrue();
    } finally {
        tmpFolder.removeCallback();
    }
});
