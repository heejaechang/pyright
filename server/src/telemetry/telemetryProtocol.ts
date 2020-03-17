/*
 * telemetry.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 */

import { TelemetryEvent } from './telemetryEvent';

export enum EventName {
    IMPORT_METRICS = 'import_metrics',
    ANALYSIS_COMPLETE = 'analysis_complete'
}

//Helpers
export function addNumericsToTelemetry(te: TelemetryEvent, importMetrics: Object) {
    for (const [key, value] of Object.entries(importMetrics)) {
        if (typeof value == 'number') {
            if (te.Measurements[key] === undefined) {
                te.Measurements[key] = value;
            } else {
                te.Measurements[key] += value;
            }
        }
    }
}
