/*
 * logger.ts
 *
 * Definitions of logging service.
 */

export enum LogLevel {
    Error,
    Warning,
    Info,
    Trace
}

export interface LogService {
    setLogLevel(level: LogLevel): void;
    log(level: LogLevel, message: string): void;
}
