/*
 * analysisTracker.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 */

import { AnalysisResults } from 'pyright-internal/analyzer/analysis';
import { Duration } from 'pyright-internal/common/timing';

import { TelemetryEvent, TelemetryEventName } from '../common/telemetry';

const TelemetryWaitTimeSeconds = 60;

export class AnalysisTracker {
    private _elapsedSum = 0; // In seconds.
    private _telemetryLimiter?: Duration;
    private _peakRss = 0; // Peak memory during an analysis (in bytes), not for the entire process.
    // private _numFilesAnalyzed = 0; // This number is dubious.

    updateTelemetry(results: AnalysisResults): TelemetryEvent | undefined {
        const isComplete =
            (results.filesRequiringAnalysis === 0 && results.elapsedTime !== 0) || results.fatalErrorOccurred;
        const isFirstRun = !this._telemetryLimiter;

        this._elapsedSum += results.elapsedTime;

        if (isFirstRun && isComplete) {
            // First run is complete. Start limiting from now on.
            this._telemetryLimiter = new Duration();
        } else if (this._telemetryLimiter && this._telemetryLimiter.getDurationInSeconds() < TelemetryWaitTimeSeconds) {
            // Too soon to send another event. Skip sending and reset if complete.
            if (isComplete) {
                this._elapsedSum = 0;
                this._peakRss = 0;
                return undefined;
            }

            const usage = process.memoryUsage();
            this._peakRss = Math.max(usage.rss, this._peakRss);

            return undefined;
        }

        const usage = process.memoryUsage();
        this._peakRss = Math.max(usage.rss, this._peakRss);

        if (!isComplete) {
            return undefined;
        }

        const peakRss = this._peakRss;
        const elapsedMs = this._elapsedSum * 1000;

        this._elapsedSum = 0;
        this._telemetryLimiter = new Duration();
        this._peakRss = 0;

        const te = new TelemetryEvent(TelemetryEventName.ANALYSIS_COMPLETE);

        te.Measurements['peakRssMB'] = peakRss / 1024 / 1024;
        te.Measurements['rssMB'] = usage.rss / 1024 / 1024;
        te.Measurements['heapTotalMB'] = usage.heapTotal / 1024 / 1024;
        te.Measurements['heapUsedMB'] = usage.heapUsed / 1024 / 1024;
        te.Measurements['externalMB'] = usage.external / 1024 / 1024;
        te.Measurements['elapsedMs'] = elapsedMs;
        te.Measurements['numFilesAnalyzed'] = -1; // TODO: Figure out how to actually calculate this.
        te.Measurements['numFilesInProgram'] = results.filesInProgram;
        te.Measurements['fatalErrorOccurred'] = results.fatalErrorOccurred ? 1 : 0;
        te.Measurements['isFirstRun'] = isFirstRun ? 1 : 0;

        return te;
    }
}
