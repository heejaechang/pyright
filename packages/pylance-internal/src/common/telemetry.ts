/*
 * telemetry.ts
 *
 * Definitions of services available.
 */

import { sha256 } from 'hash.js';
import { Connection } from 'vscode-languageserver/node';

import { assert, getSerializableError } from 'pyright-internal/common/debug';
import { CompletionResults, ModuleContext } from 'pyright-internal/languageService/completionProvider';

import { VERSION } from './constants';

export enum TelemetryEventName {
    IMPORT_METRICS = 'import_metrics',
    ANALYSIS_COMPLETE = 'analysis_complete',
    ANALYSIS_EXCEPTION = 'analysis_exception',
    INTELLICODE_ENABLED = 'intellicode_enabled',
    INTELLICODE_COMPLETION_ITEM_SELECTED = 'intellicode_completion_item_selected',
    INTELLICODE_MODEL_LOAD_FAILED = 'intellicode_model_load_failed',
    INTELLICODE_ONNX_LOAD_FAILED = 'intellicode_onnx_load_failed',
    COMPLETION_METRICS = 'completion_metrics',
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

    readonly Exception: Error | undefined;

    constructor(eventName: string, ex?: Error) {
        this.EventName = formatEventName(eventName);
        this.Exception = getSerializableError(ex);
    }

    clone(): TelemetryEvent {
        const te = new TelemetryEvent(this.EventName.substr(languageServerEventPrefix.length), this.Exception);
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

    sendExceptionTelemetry(eventName: string, e: Error): void {
        this.sendTelemetry(new TelemetryEvent(eventName, e));
    }

    sendMeasurementsTelemetry(telemetryEventName: TelemetryEventName, metrics: Object) {
        const te = new TelemetryEvent(telemetryEventName);
        addMeasurementsToEvent(te, metrics);
        this.sendTelemetry(te);
    }
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

export namespace StubTelemetry {
    let _timer: NodeJS.Timeout | undefined;
    const _limitCompletionWaitTimeMs = 2000;

    // Send telemetry for empty completions, and the first known module name we could find searching left in the statement.
    // ie. A.B.Unknown.  return moduleName for B
    export function sendStubCompletionTelemetryForMissingTypes(
        results: CompletionResults | undefined,
        service: TelemetryService
    ) {
        if (
            results?.completionList?.items.length === 0 &&
            results.moduleContext?.lastKnownModule &&
            results.moduleContext.lastKnownModule.length > 0
        ) {
            const event = new TelemetryEvent(TelemetryEventName.COMPLETION_METRICS);
            addModuleInfoToEvent(event, results.moduleContext);

            //delay sending completion telemetry until user is done typing
            //we don't really want to send data on partially typed words, and most likely
            //the current type is unknown because the user hasn't finished typing it.
            if (_timer) {
                clearTimeout(_timer);
            }
            _timer = setTimeout(() => {
                service.sendTelemetry(event);
            }, _limitCompletionWaitTimeMs);
        }
    }
}

export function addModuleInfoToEvent(te: TelemetryEvent, moduleContext: ModuleContext) {
    for (const [key, value] of Object.entries(moduleContext)) {
        const strValue: string = ((value as string) ?? '').toLocaleLowerCase();
        if (strValue && strValue.length > 0) {
            const hash = sha256().update(strValue);
            te.Properties[key + 'Hash'] = hash.digest('hex');

            // if (process.env.NODE_ENV === 'development') {
            //     te.Properties[key] = strValue;
            // }
        }
    }

    if (moduleContext && moduleContext?.lastKnownModule) {
        const packageName = moduleContext?.lastKnownModule.split('.')[0].toLocaleLowerCase();
        const packageHash = sha256().update(packageName);
        te.Properties['packageHash'] = packageHash.digest('hex');
        // if (process.env.NODE_ENV === 'development') {
        //     te.Properties['package'] = packageName;
        // }
    }

    return te;
}

export function getExceptionMessage(e: any): string {
    let message = exceptionToString(e);
    if (e.code) {
        message += `, Error code: ${e.code}`;
    }
    return message;
}

export function exceptionToString(e: any): string {
    return (
        (e.stack ? e.stack.toString() : undefined) ||
        (typeof e.message === 'string' ? e.message : undefined) ||
        JSON.stringify(e)
    );
}
