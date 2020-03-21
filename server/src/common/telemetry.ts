/*
 * telemetry.ts
 *
 * Definitions of services available.
 */

export enum TelemetryEventName {
    IMPORT_METRICS = 'import_metrics',
    ANALYSIS_COMPLETE = 'analysis_complete',
    EXCEPTION = 'exception',
    EXCEPTION_IC = 'exception_intellicode'
}

// Note: These names must match the expected values in the VSCode Python Extension
// https://github.com/microsoft/vscode-python/blob/master/src/client/activation/languageServer/languageServerProxy.ts
export class TelemetryEvent {
    readonly EventName: string;

    readonly Properties: {
        [key: string]: string;
    } = {};

    readonly Measurements: {
        [key: string]: number;
    } = {};

    constructor(eventName: string) {
        this.EventName = `mpls_node/${eventName}`;
    }
}

export interface TelemetryService {
    sendTelemetry(event: TelemetryEvent): void;
}

export function sendExceptionTelemetry(ts: TelemetryService, eventName: TelemetryEventName, e: any): void {
    if (!(e instanceof Error)) {
        return;
    }

    const te = new TelemetryEvent(eventName);
    te.Properties['exception-name'] = e.name;
    if (e.stack) {
        te.Properties['exception-call-stack'] = e.stack;
    }
    this.telemetry.sendTelemetry(te);
}

export function sendMeasurementsTelemetry(
    ts: TelemetryService,
    telemetryEventName: TelemetryEventName,
    metrics: Object
) {
    const te = new TelemetryEvent(telemetryEventName);
    addMeasurementsToEvent(te, metrics);
    this.telemetry.sendTelemetry(te);
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
