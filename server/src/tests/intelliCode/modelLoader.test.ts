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

import { ModelLoader } from '../../../intelliCode/modelLoader';
import { getZip, Zip } from '../../../intelliCode/zip';
import { createFromRealFileSystem, FileSystem } from '../../../pyright/server/src/common/fileSystem';
import { LogLevel, LogService } from '../../common/logger';
import { formatEventName, TelemetryEventName, TelemetryService } from '../../common/telemetry';

let mockedFs: FileSystem;
let mockedLog: LogService;
let log: LogService;
let mockedTelemetry: TelemetryService;
let telemetry: TelemetryService;

const modelFolder = 'modelFolder';
const intelliCode = 'IntelliCode';
const intelliCodeFolder = path.join(modelFolder, intelliCode);

beforeEach(() => {
    mockedFs = mock<FileSystem>();
    mockedLog = mock<LogService>();
    log = instance(mockedLog);
    mockedTelemetry = mock<TelemetryService>();
    telemetry = instance(mockedTelemetry);
});

test('IntelliCode model loader: unpack model', async () => {
    const tmpSrcFolder = dirSync();
    const tmpDstFolder = dirSync();

    try {
        // Copy model zip to a temp folder elsewhere
        const srcFolder = process.cwd();
        const testModelPath = path.join(srcFolder, 'src', 'tests', 'intelliCode', 'data', 'model.zip');
        const icFolder = path.join(tmpSrcFolder.name, 'IntelliCode');

        realFs.mkdirSync(icFolder);
        realFs.copyFileSync(testModelPath, path.join(icFolder, 'model.zip'));

        const vfs = createFromRealFileSystem();
        const m = await new ModelLoader(vfs, getZip(vfs), log, telemetry).loadModel(tmpSrcFolder.name);

        expect(m).toBeDefined();
        expect(m!.metaData.LicenseTerm.length).toBeGreaterThan(0);
        expect(m!.metaData.ModelName).toEqual('Python_$base$');
        expect(m!.metaData.Version).toEqual('0.0.1');

        expect(m!.tokens.length).toEqual(5);
        expect(m!.tokens[0]).toEqual('padding_token');

        expect(realFs.existsSync(path.join(icFolder, 'model.onnx'))).toBeTrue();
        verify(mockedTelemetry.sendTelemetry(anything())).never();
    } finally {
        tmpSrcFolder.removeCallback();
        tmpDstFolder.removeCallback();
    }
});

class FsError implements Error, NodeJS.ErrnoException {
    errno?: number | undefined;
    code?: string | undefined;
    path?: string | undefined;
    syscall?: string | undefined;
    stack?: string | undefined;
    name: string;
    message: string;
}

function makeError(): Error {
    const error = new Error('Error');
    error.name = 'Error';
    return error;
}

test('IntelliCode model loader: unable to creare model folder', async () => {
    const fse: FsError = {
        code: 'ERROR',
        name: 'ERROR',
        message: 'ERROR',
    };

    when(mockedFs.mkdirSync(anyString())).thenThrow(fse);
    const fs = instance(mockedFs);
    const mockedZip = mock<Zip>();

    await new ModelLoader(fs, mockedZip, log, telemetry).loadModel(modelFolder);

    const [mkd_arg1] = capture(mockedFs.mkdirSync).first();
    expect(mkd_arg1).toEqual(intelliCodeFolder);

    verify(mockedLog.log(LogLevel.Error, anyString())).once();

    const [log_arg1, log_arg2] = capture(mockedLog.log).first();
    expect(log_arg1).toEqual(LogLevel.Error);
    expect(log_arg2).toStartWith('Unable to create folder');

    verify(mockedTelemetry.sendTelemetry(anything())).once();

    const [te] = capture(mockedTelemetry.sendTelemetry).first();
    expect(te.EventName).toEqual(formatEventName(TelemetryEventName.EXCEPTION_IC));
    expect(te.Properties['exception-name']).toStartWith('ERROR');
});

test('IntelliCode model loader: no unpack on existing model', async () => {
    const metadataFile = path.join(intelliCodeFolder, 'metadata.json');
    const tokensFile = path.join(intelliCodeFolder, 'tokens.json');

    when(mockedFs.existsSync(metadataFile)).thenReturn(true);
    when(mockedFs.existsSync(tokensFile)).thenReturn(true);
    when(mockedFs.readdirSync(intelliCodeFolder)).thenReturn([path.join(intelliCodeFolder, '1.onnx')]);
    const fs = instance(mockedFs);

    const mockedZip = mock<Zip>();
    await new ModelLoader(fs, mockedZip, log).loadModel(modelFolder);

    verify(mockedFs.existsSync(metadataFile)).once();
    verify(mockedFs.existsSync(tokensFile)).once();
    verify(mockedFs.readdirSync(intelliCodeFolder)).once();

    const [arg] = capture(mockedFs.mkdirSync).first();
    expect(arg).toEqual(intelliCodeFolder);
});

test('IntelliCode model loader: failed to unpack model', async () => {
    const mockedZip = mock<Zip>();

    when(mockedZip.unzip(anyString(), anyString())).thenThrow(makeError());
    await new ModelLoader(instance(mockedFs), instance(mockedZip), log, telemetry).loadModel(modelFolder);

    verifyErrorLog('Unable to unpack');
    verifyErrorTelemetry();
});

test('IntelliCode model loader: unable to read folder', async () => {
    when(mockedFs.readdirSync(anyString())).thenThrow(makeError());
    await verifyLogOnError(instance(mockedFs), 'Unable to access');

    verifyErrorTelemetry();
});

test('IntelliCode model loader: no files in folder', async () => {
    when(mockedFs.readdirSync(anyString())).thenReturn([]);
    await verifyLogOnError(instance(mockedFs), 'Unable to find');
});

test('IntelliCode model loader: unable to read JSON', async () => {
    when(mockedFs.readFileText(anyString(), anyString())).thenThrow(makeError());
    when(mockedFs.readdirSync(anyString())).thenReturn(['1.onnx']);

    await verifyLogOnError(instance(mockedFs), 'Unable to read');
});

test('IntelliCode model loader: unable to parse JSON', async () => {
    when(mockedFs.readFileText(anyString(), anyString())).thenReturn(Promise.resolve('***'));
    when(mockedFs.readdirSync(anyString())).thenReturn(['1.onnx']);

    await verifyLogOnError(instance(mockedFs), 'Unable to parse');
});

async function verifyLogOnError(fs: FileSystem, message: string): Promise<void> {
    const mockedZip = mock<Zip>();
    when(mockedZip.unzip(anyString(), anyString())).thenReturn(Promise.resolve(3));

    await new ModelLoader(fs, instance(mockedZip), log, telemetry).loadModel(modelFolder);
    verifyErrorLog(message);
}

function verifyErrorLog(message: string) {
    verify(mockedLog.log(LogLevel.Error, anyString())).once();
    const [l, m] = capture(mockedLog.log).first();
    expect(l).toEqual(LogLevel.Error);
    expect(m).toStartWith(message);
}

function verifyErrorTelemetry() {
    verify(mockedTelemetry.sendTelemetry(anything())).once();
    const [te] = capture(mockedTelemetry.sendTelemetry).first();
    expect(te.EventName).toEqual(formatEventName(TelemetryEventName.EXCEPTION_IC));
    expect(te.Properties['exception-name']).toStartWith('Error');
}
