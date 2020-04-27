/*
 * logger.ts
 *
 * Logging service implementation.
 */

import { RemoteConsole } from 'vscode-languageserver';

import { assert } from '../../pyright/server/src/common/debug';
import { LogLevel, LogService } from '../common/logger';

export class LogServiceImplementation implements LogService {
    private _levelMap: Map<string, number> = new Map([
        [LogLevel.Error, 0],
        [LogLevel.Warning, 1],
        [LogLevel.Info, 2],
        [LogLevel.Trace, 3],
    ]);
    private _maxLevel = 2;

    constructor(private _console?: RemoteConsole) {}

    setLogLevel(level: LogLevel): void {
        let maxLevel = this._levelMap.get(level);
        if (maxLevel === undefined) {
            maxLevel = 2;
        }
        this._maxLevel = maxLevel;
    }

    log(level: LogLevel, message: string): void {
        if (this.getNumericalLevel(level) > this._maxLevel) {
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

    private getNumericalLevel(level: LogLevel): number {
        const numericLevel = this._levelMap.get(level);
        assert(numericLevel !== undefined, 'Logger: unknown log level.');
        return numericLevel !== undefined ? numericLevel : 2;
    }
}
