/*
 * logger.test.ts
 *
 * Logger service tests.
 */

import * as assert from 'assert';
import { anyString, capture, instance, mock, verify } from 'ts-mockito';

import { ConsoleInterface, ConsoleWithLogLevel, LogLevel } from '../../pyright/server/src/common/console';
import { LogService } from '../common/logger';

let mockedRemoteConsole: ConsoleInterface;
let con: ConsoleWithLogLevel;
let ls: LogService;

describe('Logger', () => {
    beforeEach(() => {
        mockedRemoteConsole = mock<ConsoleInterface>();
        con = new ConsoleWithLogLevel(instance(mockedRemoteConsole));
        ls = new LogService(con);
    });

    test('default log level', () => {
        // Default log level
        ls.log(LogLevel.Error, 'error');
        ls.log(LogLevel.Warn, 'warn');
        ls.log(LogLevel.Info, 'info');
        ls.log(LogLevel.Log, 'trace');

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
        con.level = LogLevel.Error;

        ls.log(LogLevel.Error, 'error');
        ls.log(LogLevel.Warn, 'warn');
        ls.log(LogLevel.Info, 'info');
        ls.log(LogLevel.Log, 'trace');

        const [ca] = capture(mockedRemoteConsole.error).first();

        const arg = ca as string;
        verify(mockedRemoteConsole.error(arg)).once();
        assert(arg === 'error');

        verify(mockedRemoteConsole.warn(anyString())).never();
        verify(mockedRemoteConsole.info(anyString())).never();
        verify(mockedRemoteConsole.log(anyString())).never();
    });

    test('warning level', () => {
        con.level = LogLevel.Warn;

        ls.log(LogLevel.Error, 'error');
        ls.log(LogLevel.Warn, 'warn');
        ls.log(LogLevel.Info, 'info');
        ls.log(LogLevel.Log, 'trace');

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
        con.level = LogLevel.Info;

        ls.log(LogLevel.Error, 'error');
        ls.log(LogLevel.Warn, 'warn');
        ls.log(LogLevel.Info, 'info');
        ls.log(LogLevel.Log, 'trace');

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
        con.level = LogLevel.Log;

        ls.log(LogLevel.Error, 'error');
        ls.log(LogLevel.Warn, 'warn');
        ls.log(LogLevel.Info, 'info');
        ls.log(LogLevel.Log, 'trace');

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
        con.level = LogLevel.Error;
        expect(ls.level).toEqual(LogLevel.Error);
        con.level = LogLevel.Warn;
        expect(ls.level).toEqual(LogLevel.Warn);
        con.level = LogLevel.Info;
        expect(ls.level).toEqual(LogLevel.Info);
        con.level = LogLevel.Log;
        expect(ls.level).toEqual(LogLevel.Log);
    });
});
