/*
 * logger.ts
 *
 * Logging service implementation.
 */

import { RemoteConsole } from 'vscode-languageserver';
import { LogService, LogLevel } from '../common/logger';

export class LogServiceImplementation implements LogService {
    private _minLevel: LogLevel = LogLevel.Info;

    constructor(private _console?: RemoteConsole) {}

    setLogLevel(level: LogLevel): void {
        this._minLevel = level;
    }

    log(level: LogLevel, message: string): void {
        if (level > this._minLevel) {
            return;
        }
        switch (level) {
            case LogLevel.Error:
                this._console?.error(message);
                break;
            case LogLevel.Warning:
                this._console?.warn(message);
                break;
            case LogLevel.Info:
                this._console?.info(message);
                break;
            case LogLevel.Trace:
                this._console?.log(message);
                break;
        }
    }
}
