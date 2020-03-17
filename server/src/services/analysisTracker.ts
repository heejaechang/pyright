/*
 * analysisTracker.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 */

import { AnalysisResults } from '../../pyright/server/src/analyzer/service';
import { Duration } from '../../pyright/server/src/common/timing';
import { TelemetryEvent, TelemetryEventName } from '../common/telemetry';

const TelemetryWaitTimeSeconds = 60;

export class AnalysisTracker {
    private _peakRssMB = 0;
    private _isTrackingAnalysis = false;
    private _isFirstRun = true;
    private _numFilesAnalyzed = 0;
    private _analysisDuration: Duration;
    private _initalAnalysisElapsedTimeSeconds: number;
    private _telemetryLimiter: Duration | undefined;

    updateTelemetry(results: AnalysisResults): TelemetryEvent | undefined {
        // track peak memory during long running analysis or during the first run analysis
        // also send telemetry if an error occurred
        if (results.filesRequiringAnalysis > 0 || this._isFirstRun || results.fatalErrorOccurred) {
            if (!this._isTrackingAnalysis) {
                this._isTrackingAnalysis = true;
                this._analysisDuration = new Duration();
                this._numFilesAnalyzed = results.filesRequiringAnalysis;
                this._initalAnalysisElapsedTimeSeconds = results.elapsedTime;
            }

            const usage = process.memoryUsage();
            this._peakRssMB = Math.max(usage.rss, this._peakRssMB);
        }

        if ((this._isTrackingAnalysis && results.filesRequiringAnalysis === 0) || results.fatalErrorOccurred) {
            this._isTrackingAnalysis = false;

            const canSendTelemetry =
                this._telemetryLimiter == undefined ||
                this._telemetryLimiter.getDurationInSeconds() > TelemetryWaitTimeSeconds;
            if (!canSendTelemetry) {
                this._peakRssMB = 0;
                return;
            }
            this._telemetryLimiter = new Duration();

            try {
                const usage = process.memoryUsage();
                const measurements = new Map<string, number>();

                measurements.set('peakRssMB', Math.max(usage.rss, this._peakRssMB) / 1024 / 1024);
                measurements.set('rssMB', usage.rss / 1024 / 1024);
                measurements.set('heapTotalMB', usage.heapTotal / 1024 / 1024);
                measurements.set('heapUsedMB', usage.heapUsed / 1024 / 1024);
                measurements.set('externalMB', usage.external / 1024 / 1024);
                measurements.set(
                    'elapsedMs',
                    this._analysisDuration?.getDurationInMilliseconds() + this._initalAnalysisElapsedTimeSeconds / 1000
                );
                measurements.set('numFilesAnalyzed', this._numFilesAnalyzed);
                measurements.set('numFilesInProgram', results.filesInProgram);
                measurements.set('fatalErrorOccurred', results.fatalErrorOccurred ? 1 : 0);
                measurements.set('isFirstRun', this._isFirstRun ? 1 : 0);

                return new TelemetryEvent(TelemetryEventName.ANALYSIS_COMPLETE, undefined, measurements);
            } finally {
                this._peakRssMB = 0;
                this._isFirstRun = false;
            }
        }
        return;
    }
}
