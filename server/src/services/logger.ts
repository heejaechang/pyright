/*
 * logger.ts
 *
 * Logging service implementation.
 */

import { RemoteConsole } from 'vscode-languageserver';

import { LogLevel, LogService } from '../common/logger';

export class LogServiceImplementation implements LogService {
    private _maxLevel: LogLevel = LogLevel.Info;

    constructor(private _console?: RemoteConsole) {}

    setLogLevel(level: LogLevel): void {
        this._maxLevel = level;
    }

    log(level: LogLevel, message: string): void {
        if (level > this._maxLevel) {
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
