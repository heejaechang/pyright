/*
 * logger.ts
 *
 * Definitions of logging service.
 */

export enum LogLevel {
    Error = 'Error',
    Warning = 'Warning',
    Info = 'Info',
    Trace = 'Trace',
}

export interface LogService {
    setLogLevel(level: LogLevel): void;
    log(level: LogLevel, message: string): void;
}
