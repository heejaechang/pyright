/*
 * logger.ts
 *
 * Logging service implementation.
 */

import { ConsoleWithLogLevel, log as consoleLog, LogLevel } from 'pyright-internal/common/console';

export class LogService {
    constructor(private _console: ConsoleWithLogLevel) {}

    get level(): LogLevel {
        return this._console.level;
    }

    log(level: LogLevel, message: string): void {
        consoleLog(this._console, level, message);
    }
}
