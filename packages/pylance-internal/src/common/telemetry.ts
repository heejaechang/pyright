/*
 * telemetry.ts
 *
 * Definitions of services available.
 */

import { createHash } from 'crypto';
import { Connection } from 'vscode-languageserver/node';

import { isString, isThenable } from 'pyright-internal/common/core';
import { assert, getSerializableError } from 'pyright-internal/common/debug';
import { Duration, timingStats } from 'pyright-internal/common/timing';
import { CompletionResults, MemberAccessInfo } from 'pyright-internal/languageService/completionProvider';

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
    COMPLETION_COVERAGE = 'completion_coverage',
    COMPLETION_SLOW = 'completion_slow',
    INDEX_SLOW = 'index_slow',
    WORKSPACEINDEX_SLOW = 'workspaceindex_slow',
    SEMANTICTOKENS_SLOW = 'semantictokens_slow',
}

const statsDelayMs = 5 * 1000 * 60; // 5 minutes

const languageServerEventPrefix = 'language_server/';
// Exported for tests.
export function formatEventName(eventName: string): string {
    return `${languageServerEventPrefix}${eventName}`;
}

export interface TelemetryEventInterface {
    readonly EventName: string;
    readonly Properties: { [key: string]: string };
    readonly Measurements: { [key: string]: number };
}

// Note: These names must match the expected values in the VSCode Python Extension
// https://github.com/microsoft/vscode-python/blob/master/src/client/activation/languageServer/languageServerProxy.ts
export class TelemetryEvent implements TelemetryEventInterface {
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

export interface TelemetryInterface {
    sendTelemetry(event: TelemetryEventInterface): void;
}

export class TelemetryService implements TelemetryInterface {
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
            results.memberAccessInfo?.lastKnownModule &&
            results.memberAccessInfo.lastKnownModule.length > 0
        ) {
            const event = new TelemetryEvent(TelemetryEventName.COMPLETION_METRICS);
            addModuleInfoToEvent(event, results.memberAccessInfo);

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

export function addModuleInfoToEvent(te: TelemetryEvent, memberAccessInfo: MemberAccessInfo) {
    for (const [key, value] of Object.entries(memberAccessInfo)) {
        if (isString(value)) {
            const strValue = value.toLowerCase();
            if (strValue && strValue.length > 0) {
                const hash = createHash('sha256').update(strValue);
                te.Properties[key + 'Hash'] = hash.digest('hex');

                // if (process.env.NODE_ENV === 'development') {
                //     te.Properties[key] = strValue;
                // }
            }
        }
    }

    if (memberAccessInfo && memberAccessInfo?.lastKnownModule) {
        const packageName = memberAccessInfo?.lastKnownModule.split('.')[0].toLowerCase();
        const packageHash = createHash('sha256').update(packageName);
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

export namespace CompletionCoverage {
    enum Measure {
        Successes = 'successes',
        Failures = 'failures',
        Total = 'total',
        OverallSuccesses = 'overallSuccesses',
        OverallFailures = 'overallFailures',
        OverallTotal = 'overallTotal',
    }

    export class CompletionTelemetry {
        private _timer: NodeJS.Timeout | undefined;
        private _event: TelemetryEvent;

        constructor(private _service: TelemetryService) {
            this._event = new TelemetryEvent(TelemetryEventName.COMPLETION_COVERAGE);
            this._initStats(this._event);
        }

        update(results: CompletionResults | undefined) {
            // limit our completion stats to member completions which
            // are the only type to have a memberAccessInfo
            if (!results?.memberAccessInfo) {
                return;
            }

            if (!results?.completionList?.items.length) {
                this._event.Measurements[Measure.Failures] += 1;
            } else {
                this._event.Measurements[Measure.Successes] += 1;
            }

            this._event.Measurements[Measure.Total] += 1;

            if (this._timer) {
                return;
            }

            this._timer = setTimeout(() => {
                // Update accumulations
                this._event.Measurements[Measure.OverallSuccesses] += this._event.Measurements[Measure.Successes];
                this._event.Measurements[Measure.OverallFailures] += this._event.Measurements[Measure.Failures];
                this._event.Measurements[Measure.OverallTotal] += this._event.Measurements[Measure.Total];

                this._service.sendTelemetry(this._event);

                // Clear window stats
                this._event.Measurements[Measure.Successes] = 0;
                this._event.Measurements[Measure.Failures] = 0;
                this._event.Measurements[Measure.Total] = 0;

                // Reset timer
                if (this._timer) {
                    clearTimeout(this._timer);
                    this._timer = undefined;
                }
            }, statsDelayMs);
        }

        private _initStats(event: TelemetryEvent) {
            event.Measurements[Measure.Successes] = 0;
            event.Measurements[Measure.Failures] = 0;
            event.Measurements[Measure.Total] = 0;
            event.Measurements[Measure.OverallSuccesses] = 0;
            event.Measurements[Measure.OverallFailures] = 0;
            event.Measurements[Measure.OverallTotal] = 0;
        }
    }
}

export function trackPerf<T>(
    service: TelemetryInterface,
    eventName: string,
    callback: (customMeasures: { addCustomMeasure: (name: string, measure: number) => void }) => Promise<T>,
    thresholdInMS: number
): Promise<T>;
export function trackPerf<T>(
    service: TelemetryInterface,
    eventName: string,
    callback: (customMeasures: { addCustomMeasure: (name: string, measure: number) => void }) => T,
    thresholdInMS: number
): T;
export function trackPerf<T>(
    service: TelemetryInterface,
    eventName: string,
    callback: (customMeasures: { addCustomMeasure: (name: string, measure: number) => void }) => T | Promise<T>,
    thresholdInMS: number
): T | Promise<T> {
    const duration = new Duration();

    const readCallCount = timingStats.readFileTime.callCount;
    const tokenizeCallCount = timingStats.tokenizeFileTime.callCount;
    const parseCallCount = timingStats.parseFileTime.callCount;
    const resolveCallCount = timingStats.resolveImportsTime.callCount;
    const bindCallCount = timingStats.bindTime.callCount;

    const readTime = timingStats.readFileTime.totalTime;
    const tokenizeTime = timingStats.tokenizeFileTime.totalTime;
    const parseTime = timingStats.parseFileTime.totalTime;
    const resolveTime = timingStats.resolveImportsTime.totalTime;
    const bindTime = timingStats.bindTime.totalTime;

    let map:
        | {
              [key: string]: number;
          }
        | undefined;

    const customMeasures = {
        addCustomMeasure(name: string, measure: number) {
            if (!map) {
                map = {};
            }

            map[`custom_${name}`] = measure;
        },
    };

    // This will only send telemetry when callback succeeded.
    // Otherwise, it won't send (including cancellation case).
    const result = callback(customMeasures);
    if (isThenable(result)) {
        return result.then((r) => {
            recordTelemetry();
            return r;
        });
    }

    recordTelemetry();
    return result;

    function recordTelemetry() {
        const totalTime = duration.getDurationInMilliseconds();
        if (totalTime > thresholdInMS) {
            const event = new TelemetryEvent(eventName);

            if (map) {
                addMeasurementsToEvent(event, map);
            }

            event.Measurements['readFileCallCount'] = timingStats.readFileTime.callCount - readCallCount;
            event.Measurements['tokenizeCallCount'] = timingStats.tokenizeFileTime.callCount - tokenizeCallCount;
            event.Measurements['parseCallCount'] = timingStats.parseFileTime.callCount - parseCallCount;
            event.Measurements['resolveCallCount'] = timingStats.resolveImportsTime.callCount - resolveCallCount;
            event.Measurements['bindCallCount'] = timingStats.bindTime.callCount - bindCallCount;

            event.Measurements['readFileTime'] = timingStats.readFileTime.totalTime - readTime;
            event.Measurements['tokenizeTime'] = timingStats.tokenizeFileTime.totalTime - tokenizeTime;
            event.Measurements['parseTime'] = timingStats.parseFileTime.totalTime - parseTime;
            event.Measurements['resolveTime'] = timingStats.resolveImportsTime.totalTime - resolveTime;
            event.Measurements['bindTime'] = timingStats.bindTime.totalTime - bindTime;

            event.Measurements['totalTime'] = totalTime;

            service.sendTelemetry(event);
        }
    }
}
