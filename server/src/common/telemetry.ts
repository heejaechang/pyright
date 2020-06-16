/*
 * telemetry.ts
 *
 * Definitions of services available.
 */

import { Connection } from 'vscode-languageserver/node';

import { assert } from '../../pyright/server/src/common/debug';
import { VERSION } from './constants';

export enum TelemetryEventName {
    IMPORT_METRICS = 'import_metrics',
    ANALYSIS_COMPLETE = 'analysis_complete',
    INTELLICODE_ENABLED = 'intellicode_enabled',
    INTELLICODE_COMPLETION_ITEM_SELECTED = 'intellicode_completion_item_selected',
}

const languageServerEventPrefix = 'language_server/';
// Exported for tests.
export function formatEventName(eventName: string): string {
    return `${languageServerEventPrefix}${eventName}`;
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

    clone(): TelemetryEvent {
        const te = new TelemetryEvent(this.EventName.substr(languageServerEventPrefix.length));
        for (const key in this.Properties) {
            te.Properties[key] = this.Properties[key];
        }
        for (const key in this.Measurements) {
            te.Measurements[key] = this.Measurements[key];
        }
        return te;
    }
}

export class TelemetryService {
    private _connection: Connection;

    constructor(connection: any) {
        assert(connection !== undefined);
        this._connection = connection as Connection;
        assert(this._connection !== undefined);
    }

    sendTelemetry(event: TelemetryEvent): void {
        this._connection?.telemetry.logEvent(event);
    }
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
        if (typeof value === 'number') {
            const current = te.Measurements[key] || 0;
            te.Measurements[key] = current + value;
        }
    }
    return te;
}
