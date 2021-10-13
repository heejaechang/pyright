/*
 * telemetry.ts
 *
 * Definitions of services available.
 */

import { v4 as uuidv4 } from 'uuid';
import { Connection } from 'vscode-languageserver';

import { isString, isThenable } from 'pyright-internal/common/core';
import { assert, getSerializableError } from 'pyright-internal/common/debug';
import { Duration, timingStats } from 'pyright-internal/common/timing';
import { CompletionResults, MemberAccessInfo } from 'pyright-internal/languageService/completionProvider';

import { VERSION } from './constants';
import { sha256 } from './crypto';

export enum TelemetryEventName {
    IMPORT_METRICS = 'import_metrics',
    IMPORT_HEURISTIC = 'import_heuristic',
    ANALYSIS_COMPLETE = 'analysis_complete',
    ANALYSIS_EXCEPTION = 'analysis_exception',
    INTELLICODE_ENABLED = 'intellicode_enabled',
    INTELLICODE_COMPLETION_ITEM_SELECTED = 'intellicode_completion_item_selected',
    INTELLICODE_MODEL_LOAD_FAILED = 'intellicode_model_load_failed',
    INTELLICODE_ONNX_LOAD_FAILED = 'intellicode_onnx_load_failed',
    COMPLETION_ACCEPTED = 'completion_accepted',
    COMPLETION_METRICS = 'completion_metrics',
    COMPLETION_COVERAGE = 'completion_coverage',
    COMPLETION_SLOW = 'completion_slow',
    INDEX_SLOW = 'index_slow',
    WORKSPACEINDEX_SLOW = 'workspaceindex_slow',
    WORKSPACEINDEX_THRESHOLD_REACHED = 'workspaceindex_threshold_reached',
    SEMANTICTOKENS_SLOW = 'semantictokens_slow',
    EXECUTE_COMMAND = 'execute_command',
    SETTINGS = 'settings',
    STARTUP_METRICS = 'startup_metrics',
    INSTALLED_PACKAGES = 'installed_packages',
    RENAME_FILES = 'rename_files',
}

const statsDelayMs = 5 * 1000 * 60; // 5 minutes

const languageServerEventPrefix = 'language_server/';

export const TelemetryWaitTimeSeconds = 60;

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
// https://github.com/microsoft/vscode-python/blob/main/src/client/activation/languageServer/languageServerProxy.ts
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

    constructor(eventName: TelemetryEventName, ex?: Error) {
        this.EventName = formatEventName(eventName);
        this.Exception = getSerializableError(ex);
    }

    clone(): TelemetryEvent {
        const te = new TelemetryEvent(
            this.EventName.substr(languageServerEventPrefix.length) as TelemetryEventName,
            this.Exception
        );
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
}

export function sendExceptionTelemetry(
    service: TelemetryInterface | undefined,
    eventName: TelemetryEventName,
    e: Error
): void {
    service?.sendTelemetry(new TelemetryEvent(eventName, e));
}

export function sendMeasurementsTelemetry(
    service: TelemetryInterface | undefined,
    eventName: TelemetryEventName,
    metrics: Object
) {
    if (!service) {
        return;
    }

    const te = new TelemetryEvent(eventName);
    addMeasurementsToEvent(te, metrics);

    service.sendTelemetry(te);
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

export function addModuleInfoToEvent(te: TelemetryEvent, memberAccessInfo: MemberAccessInfo): void {
    for (const [key, value] of Object.entries(memberAccessInfo)) {
        if (isString(value)) {
            const strValue = value.toLowerCase();
            if (strValue) {
                te.Properties[key + 'Hash'] = hashString(strValue);
                // if (process.env.NODE_ENV === 'development') {
                //     te.Properties[key] = strValue;
                // }
            }
        }
    }

    if (memberAccessInfo.lastKnownModule) {
        const packageName = memberAccessInfo.lastKnownModule.split('.')[0].toLowerCase();
        if (packageName) {
            te.Properties['packageHash'] = hashString(packageName);
            // if (process.env.NODE_ENV === 'development') {
            //     te.Properties['package'] = packageName;
            // }
        }
    }
}

export function hashModuleNamesAndAddToEvent(
    te: TelemetryEvent,
    key: string,
    moduleNames: string[],
    reportLowerCase = false
): void {
    const hashedModules = moduleNames.map((n) => hashString(n)).join(' ');
    te.Properties[`${key}Modules`] = hashedModules;

    // Assumes first word before the period is related to the package
    const packages = new Set(moduleNames.map((n) => n.split('.')[0]));
    te.Properties[`${key}Packages`] = [...packages.values()].map((n) => hashString(n)).join(' ');

    if (reportLowerCase) {
        te.Properties[`${key}PackagesLowerCase`] = [...packages.values()]
            .map((n) => hashString(n.toLowerCase()))
            .join(' ');
    }
}

export function hashString(strValue: string): string {
    return sha256(strValue);
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

export interface TrackPerfCustomMeasures {
    setCorrelationId: (id: string) => void;
    addCustomMeasure: (name: string, measure: number, minimum?: number) => void;
}

export function trackPerf<T>(
    service: TelemetryInterface,
    eventName: TelemetryEventName,
    callback: (customMeasures: TrackPerfCustomMeasures) => Promise<T>,
    thresholdInMS: number
): Promise<T>;
export function trackPerf<T>(
    service: TelemetryInterface,
    eventName: TelemetryEventName,
    callback: (customMeasures: TrackPerfCustomMeasures) => T,
    thresholdInMS: number
): T;
export function trackPerf<T>(
    service: TelemetryInterface,
    eventName: TelemetryEventName,
    callback: (customMeasures: TrackPerfCustomMeasures) => T | Promise<T>,
    thresholdInMS: number
): T | Promise<T> {
    const duration = new Duration();

    const readCallCount = timingStats.readFileTime.callCount;
    const tokenizeCallCount = timingStats.tokenizeFileTime.callCount;
    const parseCallCount = timingStats.parseFileTime.callCount;
    const resolveCallCount = timingStats.resolveImportsTime.callCount;
    const bindCallCount = timingStats.bindTime.callCount;
    const typeEvalCallCount = timingStats.typeEvaluationTime.callCount;

    const readTime = timingStats.readFileTime.totalTime;
    const tokenizeTime = timingStats.tokenizeFileTime.totalTime;
    const parseTime = timingStats.parseFileTime.totalTime;
    const resolveTime = timingStats.resolveImportsTime.totalTime;
    const bindTime = timingStats.bindTime.totalTime;
    const typeEvalTime = timingStats.typeEvaluationTime.totalTime;

    let map:
        | {
              [key: string]: number;
          }
        | undefined;

    let correlationId: string | undefined;
    const customMeasures = {
        setCorrelationId(id: string) {
            correlationId = id;
        },
        addCustomMeasure(name: string, measure: number, minimum: number | undefined) {
            if (!map) {
                map = {};
            }

            if (minimum === undefined || measure >= minimum) {
                map[`custom_${name}`] = measure;
            }
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
            event.Measurements['typeEvalCount'] = timingStats.typeEvaluationTime.callCount - typeEvalCallCount;

            event.Measurements['readFileTime'] = timingStats.readFileTime.totalTime - readTime;
            event.Measurements['tokenizeTime'] = timingStats.tokenizeFileTime.totalTime - tokenizeTime;
            event.Measurements['parseTime'] = timingStats.parseFileTime.totalTime - parseTime;
            event.Measurements['resolveTime'] = timingStats.resolveImportsTime.totalTime - resolveTime;
            event.Measurements['bindTime'] = timingStats.bindTime.totalTime - bindTime;
            event.Measurements['typeEvalTime'] = timingStats.typeEvaluationTime.totalTime - typeEvalTime;

            event.Measurements['totalTime'] = totalTime;

            if (correlationId) {
                event.Properties['correlationId'] = correlationId;
            }

            service.sendTelemetry(event);
        }
    }
}

export function createTelemetryCorrelationId() {
    return uuidv4();
}
