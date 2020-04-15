/*
 * telemetry.ts
 *
 * IntelliCode telemetry.
 */

import { v4 as uuidv4 } from 'uuid';
import { CompletionItem } from 'vscode-languageserver';

import { TelemetryEvent, TelemetryEventName } from '../src/common/telemetry';
import { FailureReason, ModelType } from './types';

export function buildRecommendationsTelemetry(
    completionItems: CompletionItem[],
    recommendations: string[],
    applied: number,
    targetTypeName: string | undefined,
    modelType: ModelType,
    elapsedMs: number,
    memoryIncrease: number
): TelemetryEvent {
    const te = new TelemetryEvent(TelemetryEventName.INTELLICODE);
    const methods = completionItems.filter((x) => x.insertText).join(',');

    let failureReason = FailureReason.None;
    if (recommendations.length > 0) {
        // There were recommendations, but there were no matching
        // items in the completion list.
        if (applied === 0) {
            failureReason = FailureReason.NotInIntersection;
        }
    } else {
        // There are completions, but nothing was recommended by the model.
        failureReason = FailureReason.NotInModel;
    }

    te.Properties['ModelType'] = modelType;
    te.Properties['FailureReason'] = failureReason;

    if (failureReason == FailureReason.NotInModel) {
        //not logging class name not in Pythia model for GDPR concerns
        te.Properties['Class'] = '';
    } else {
        te.Properties['Class'] = targetTypeName || 'undefined';
    }
    //te.Properties['InIf'] = 'false';
    te.Measurements['ElapsedTime'] = elapsedMs;
    te.Measurements['MemoryIncreaseKB'] = memoryIncrease;

    // WARNING: method names from user code are PII/User private data.
    // Make sure we ONLY send methods that are in the model, i.e. those
    // that are from public libraries!
    if (recommendations.length > 0) {
        te.Measurements['Count'] = completionItems ? completionItems.length : 0;
        te.Properties['Methods'] = methods;
    } else {
        te.Measurements['Count'] = -1; // Private.
    }

    te.Properties['ModelVersion'] = 'python_LSTM' + this._model?.metaData.Version;
    te.Properties['Id'] = uuidv4();
    // te.Properties['Language'] = 'python';
    return te;
}
