/*
 * telemetry.ts
 *
 * Definitions of services available.
 */

import { VERSION } from './constants';

function isError(o: any): o is Error {
    return 'name' in o && 'message' in o;
}

export enum TelemetryEventName {
    IMPORT_METRICS = 'import_metrics',
    ANALYSIS_COMPLETE = 'analysis_complete',
    INTELLICODE = 'intellicode',
    EXCEPTION = 'exception',
    EXCEPTION_IC = 'exception_intellicode',
}

const eventNamePrefix = 'language_server/';

// Exported for tests.
export function formatEventName(eventName: string): string {
    return `${eventNamePrefix}${eventName}`;
}

// Note: These names must match the expected values in the VSCode Python Extension
// https://github.com/microsoft/vscode-python/blob/master/src/client/activation/languageServer/languageServerProxy.ts
export class TelemetryEvent {
    readonly EventName: string;

    readonly Properties: {
        [key: string]: string;
    } = {
        lsVersion: VERSION,
    };

    readonly Measurements: {
        [key: string]: number;
    } = {};

    constructor(eventName: string) {
        this.EventName = formatEventName(eventName);
    }
}

export interface TelemetryService {
    sendTelemetry(event: TelemetryEvent): void;
}

export function sendExceptionTelemetry(ts: TelemetryService | undefined, eventName: TelemetryEventName, e: any): void {
    if (!ts || !isError(e)) {
        return;
    }
    const te = new TelemetryEvent(eventName);
    te.Properties['exception-name'] = e.name;
    if (e.stack) {
        te.Properties['exception-call-stack'] = e.stack;
    }
    ts.sendTelemetry(te);
}

export function sendMeasurementsTelemetry(
    ts: TelemetryService | undefined,
    telemetryEventName: TelemetryEventName,
    metrics: Object
) {
    if (!ts) {
        return;
    }
    const te = new TelemetryEvent(telemetryEventName);
    addMeasurementsToEvent(te, metrics);
    ts.sendTelemetry(te);
}

export function addMeasurementsToEvent(te: TelemetryEvent, metrics: Object) {
    for (const [key, value] of Object.entries(metrics)) {
        if (typeof value == 'number') {
            const current = te.Measurements[key] || 0;
            te.Measurements[key] = current + value;
        }
    }
    return te;
}
