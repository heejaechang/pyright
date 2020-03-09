/*
 * telemetry.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 */

const TelemetryPrefix = 'mpls_node/';

// Note: These names must match the expected values in the VSCode Python Extension
// https://github.com/microsoft/vscode-python/blob/master/src/client/activation/languageServer/languageServerProxy.ts
export interface TelemetryEvent {
    readonly EventName: string;

    readonly Properties: {
        [key: string]: string;
    };

    readonly Measurements: {
        [key: string]: number;
    };
}

export function createTelemetryEvent(eventName: string): TelemetryEvent {
    return {
        EventName: TelemetryPrefix + eventName,
        Properties: {
            Version: 'unknown'
        },
        Measurements: {}
    };
}
