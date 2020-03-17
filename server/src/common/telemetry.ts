/*
 * telemetry.ts
 *
 * Definitions of services available.
 */

export enum TelemetryEventName {
    IMPORT_METRICS = 'import_metrics',
    ANALYSIS_COMPLETE = 'analysis_complete',
    EXCEPTION_IC = 'exception-intellicode'
}

// Note: These names must match the expected values in the VSCode Python Extension
// https://github.com/microsoft/vscode-python/blob/master/src/client/activation/languageServer/languageServerProxy.ts
export class TelemetryEvent {
    readonly EventName: string;
    constructor(
        eventName: string,
        readonly Properties?: Map<string, string>,
        readonly Measurements?: Map<string, number>
    ) {
        this.EventName = `mpls_node/${eventName}`;
    }
}

export interface TelemetryService {
    sendTelemetry(event: TelemetryEvent): void;
}

export function sendExceptionTelemetry(ts: TelemetryService, e: any): void {
    const error = e as Error;
    if (!error) {
        return;
    }
    const properties = new Map<string, string>();
    properties.set('exception-name', error.name);
    if (error.stack) {
        properties.set('exception-call-stack', error.stack);
    }
    this.telemetry.sendTelemetry(new TelemetryEvent(TelemetryEventName.EXCEPTION_IC, properties));
}

export function sendMeasurementsTelemetry(
    ts: TelemetryService,
    telemetryEventName: TelemetryEventName,
    metrics: Object
) {
    const measurements = new Map<string, number>();
    for (const [key, value] of Object.entries(metrics)) {
        if (typeof value == 'number') {
            measurements.set(key, value);
        }
    }
    this.telemetry.sendTelemetry(new TelemetryEvent(telemetryEventName, undefined, measurements));
}
