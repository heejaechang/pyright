/*
 * analysisTracker.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 */

import { AnalysisResults } from '../../pyright/server/src/analyzer/analysis';
import { Duration } from '../../pyright/server/src/common/timing';
import { TelemetryEvent, TelemetryEventName } from '../common/telemetry';

const TelemetryWaitTimeSeconds = 1;

export class AnalysisTracker {
    private _peakRssMB = 0;
    private _isTrackingAnalysis = false;
    private _isFirstRun = true;
    private _numFilesAnalyzed = 0;
    private _analysisDuration: Duration;
    private _initalAnalysisElapsedTimeSeconds: number;
    private _telemetryLimiter: Duration | undefined;

    updateTelemetry(results: AnalysisResults): TelemetryEvent | undefined {
        // ignore first run if only a config change and no work was done.
        if (this._isFirstRun && results.elapsedTime < 0.05) {
            return;
        }

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
                const te = new TelemetryEvent(TelemetryEventName.ANALYSIS_COMPLETE);
                const usage = process.memoryUsage();

                te.Measurements['peakRssMB'] = Math.max(usage.rss, this._peakRssMB) / 1024 / 1024;
                te.Measurements['rssMB'] = usage.rss / 1024 / 1024;
                te.Measurements['heapTotalMB'] = usage.heapTotal / 1024 / 1024;
                te.Measurements['heapUsedMB'] = usage.heapUsed / 1024 / 1024;
                te.Measurements['externalMB'] = usage.external / 1024 / 1024;
                te.Measurements['elapsedMs'] =
                    this._analysisDuration?.getDurationInMilliseconds() + this._initalAnalysisElapsedTimeSeconds * 1000;
                te.Measurements['numFilesAnalyzed'] = this._numFilesAnalyzed;
                te.Measurements['numFilesInProgram'] = results.filesInProgram;
                te.Measurements['fatalErrorOccurred'] = results.fatalErrorOccurred ? 1 : 0;
                te.Measurements['isFirstRun'] = this._isFirstRun ? 1 : 0;

                return te;
            } finally {
                this._peakRssMB = 0;
                this._isFirstRun = false;
            }
        }
        return;
    }
}
