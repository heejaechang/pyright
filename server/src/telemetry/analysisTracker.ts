/*
 * analysisTracker.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 */

import { AnalysisResults } from '../../pyright/server/src/analyzer/service';
import { Duration } from '../../pyright/server/src/common/timing';
import { createTelemetryEvent, TelemetryEvent } from './telemetryEvent';

const TelemetryWaitTimeSeconds = 60;

export class AnalysisTracker {
    private _peakRssMB: number;
    private _isTrackingAnalysis: boolean;
    private _analysisDuration: Duration;
    private _numFilesAnalyzed: number;
    private _initalAnalysisElapsedTimeSeconds: number;
    private _telemetryLimiter: Duration | undefined;

    constructor() {
        this._isTrackingAnalysis = false;
        this._peakRssMB = 0;
        this._numFilesAnalyzed = 0;
    }

    updateTelemetry(results: AnalysisResults): TelemetryEvent | undefined {
        // track peak memory during long running analysis
        if (results.filesRequiringAnalysis > 0) {
            if (!this._isTrackingAnalysis) {
                this._isTrackingAnalysis = true;
                this._analysisDuration = new Duration();
                this._numFilesAnalyzed = results.filesRequiringAnalysis;
                this._initalAnalysisElapsedTimeSeconds = results.elapsedTime;
            }

            const usage = process.memoryUsage();
            this._peakRssMB = Math.max(usage.rss, this._peakRssMB);
            return;
        }

        if (this._isTrackingAnalysis) {
            this._isTrackingAnalysis = false;

            const canSendTelemetry =
                this._telemetryLimiter == undefined ||
                this._telemetryLimiter.getDurationInSeconds() > TelemetryWaitTimeSeconds;
            if (!canSendTelemetry) {
                return;
            }

            this._telemetryLimiter = new Duration();

            try {
                const usage = process.memoryUsage();
                const te = createTelemetryEvent('analysis_complete');

                te.Measurements['peakRssMB'] = Math.max(usage.rss, this._peakRssMB) / 1024 / 1024;
                te.Measurements['rssMB'] = usage.rss / 1024 / 1024;
                te.Measurements['heapTotalMB'] = usage.heapTotal / 1024 / 1024;
                te.Measurements['heapUsedMB'] = usage.heapUsed / 1024 / 1024;
                te.Measurements['externalMB'] = usage.external / 1024 / 1024;
                te.Measurements['elapsedMs'] =
                    this._analysisDuration.getDurationInMilliseconds() + this._initalAnalysisElapsedTimeSeconds / 1000;
                te.Measurements['numFilesAnalyzed'] = this._numFilesAnalyzed;
                te.Measurements['numFilesInProgram'] = results.filesInProgram;

                return te;
            } finally {
                this._peakRssMB = 0;
            }
        }
        return;
    }
}
