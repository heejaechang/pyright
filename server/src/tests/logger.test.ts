/*
 * logger.test.ts
 *
 * Logger service tests.
 */

import * as assert from 'assert';
import { anyString, capture, instance, mock, verify } from 'ts-mockito';
import { RemoteConsole } from 'vscode-languageserver';

import { LogLevel, LogService } from '../common/logger';

let ls: LogService;
let mockedRemoteConsole: RemoteConsole;

describe('Logger', () => {
    beforeEach(() => {
        mockedRemoteConsole = mock<RemoteConsole>();
        ls = new LogService(instance(mockedRemoteConsole));
    });

    test('default log level', () => {
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

    test('error level', () => {
        ls.level = LogLevel.Error;

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

    test('warning level', () => {
        ls.level = LogLevel.Warning;

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

    test('info level', () => {
        ls.level = LogLevel.Info;

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

    test('trace level', () => {
        ls.level = LogLevel.Trace;

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

    test('get/set', () => {
        ls.level = LogLevel.Error;
        expect(ls.level).toEqual(LogLevel.Error);
        ls.level = LogLevel.Warning;
        expect(ls.level).toEqual(LogLevel.Warning);
        ls.level = LogLevel.Info;
        expect(ls.level).toEqual(LogLevel.Info);
        ls.level = LogLevel.Trace;
        expect(ls.level).toEqual(LogLevel.Trace);
    });
});
