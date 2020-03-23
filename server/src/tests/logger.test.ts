/*
 * telemetry.test.ts
 *
 * Telemetry service tests.
 */

import * as assert from 'assert';
import { anyString, capture, instance, mock, verify } from 'ts-mockito';
import { RemoteConsole } from 'vscode-languageserver';

import { LogLevel, LogService } from '../common/logger';
import { LogServiceImplementation } from '../services/logger';

let ls: LogService;
let mockedRemoteConsole: RemoteConsole;

beforeEach(() => {
    mockedRemoteConsole = mock<RemoteConsole>();
    ls = new LogServiceImplementation(instance(mockedRemoteConsole));
});

test('Logger: default log level', () => {
    // Default log level
    ls.log(LogLevel.Error, 'error');
    ls.log(LogLevel.Warning, 'warn');
    ls.log(LogLevel.Info, 'info');
    ls.log(LogLevel.Trace, 'trace');

    const [errorArg] = capture(mockedRemoteConsole.error).first();
    let arg = errorArg as string;
    verify(mockedRemoteConsole.error(arg)).once();
    assert(arg === 'error');

    const [warnArg] = capture(mockedRemoteConsole.warn).first();
    arg = warnArg as string;
    verify(mockedRemoteConsole.warn(arg)).once();
    assert(arg === 'warn');

    const [infoArg] = capture(mockedRemoteConsole.info).first();
    arg = infoArg as string;
    verify(mockedRemoteConsole.info(arg)).once();
    assert(arg === 'info');

    verify(mockedRemoteConsole.log(anyString())).never();
});

test('Logger: error level', () => {
    ls.setLogLevel(LogLevel.Error);

    ls.log(LogLevel.Error, 'error');
    ls.log(LogLevel.Warning, 'warn');
    ls.log(LogLevel.Info, 'info');
    ls.log(LogLevel.Trace, 'trace');

    const [ca] = capture(mockedRemoteConsole.error).first();

    const arg = ca as string;
    verify(mockedRemoteConsole.error(arg)).once();
    assert(arg === 'error');

    verify(mockedRemoteConsole.warn(anyString())).never();
    verify(mockedRemoteConsole.info(anyString())).never();
    verify(mockedRemoteConsole.log(anyString())).never();
});

test('Logger: warning level', () => {
    ls.setLogLevel(LogLevel.Warning);

    ls.log(LogLevel.Error, 'error');
    ls.log(LogLevel.Warning, 'warn');
    ls.log(LogLevel.Info, 'info');
    ls.log(LogLevel.Trace, 'trace');

    const [errorArg] = capture(mockedRemoteConsole.error).first();
    const [warnArg] = capture(mockedRemoteConsole.warn).first();

    let arg = errorArg as string;
    verify(mockedRemoteConsole.error(arg)).once();
    assert(arg === 'error');

    arg = warnArg as string;
    verify(mockedRemoteConsole.warn(arg)).once();
    assert(arg === 'warn');

    verify(mockedRemoteConsole.info(anyString())).never();
    verify(mockedRemoteConsole.log(anyString())).never();
});

test('Logger: info level', () => {
    ls.setLogLevel(LogLevel.Info);

    ls.log(LogLevel.Error, 'error');
    ls.log(LogLevel.Warning, 'warn');
    ls.log(LogLevel.Info, 'info');
    ls.log(LogLevel.Trace, 'trace');

    const [errorArg] = capture(mockedRemoteConsole.error).first();
    const [warnArg] = capture(mockedRemoteConsole.warn).first();
    const [infoArg] = capture(mockedRemoteConsole.info).first();

    let arg = errorArg as string;
    verify(mockedRemoteConsole.error(arg)).once();
    assert(arg === 'error');

    arg = warnArg as string;
    verify(mockedRemoteConsole.warn(arg)).once();
    assert(arg === 'warn');

    arg = infoArg as string;
    verify(mockedRemoteConsole.info(arg)).once();
    assert(arg === 'info');

    verify(mockedRemoteConsole.log(anyString())).never();
});

test('Logger: trace level', () => {
    ls.setLogLevel(LogLevel.Trace);

    ls.log(LogLevel.Error, 'error');
    ls.log(LogLevel.Warning, 'warn');
    ls.log(LogLevel.Info, 'info');
    ls.log(LogLevel.Trace, 'trace');

    const [errorArg] = capture(mockedRemoteConsole.error).first();
    const [warnArg] = capture(mockedRemoteConsole.warn).first();
    const [infoArg] = capture(mockedRemoteConsole.info).first();
    const [traceArg] = capture(mockedRemoteConsole.log).first();

    let arg = errorArg as string;
    verify(mockedRemoteConsole.error(arg)).once();
    assert(arg === 'error');

    arg = warnArg as string;
    verify(mockedRemoteConsole.warn(arg)).once();
    assert(arg === 'warn');

    arg = infoArg as string;
    verify(mockedRemoteConsole.info(arg)).once();
    assert(arg === 'info');

    arg = traceArg as string;
    verify(mockedRemoteConsole.log(arg)).once();
    assert(arg === 'trace');
});
