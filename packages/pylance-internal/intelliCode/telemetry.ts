/*
 * telemetry.ts
 *
 * IntelliCode telemetry.
 */

import { v4 as uuidv4 } from 'uuid';
import { CompletionItem } from 'vscode-languageserver';

import { Commands } from '../src/commands/commands';
import { TelemetryEvent, TelemetryEventName } from '../src/common/telemetry';
import { FailureReason, ModelType } from './types';

// Builds overall IntelliCode temeletry
export function buildRecommendationsTelemetry(
    completionList: CompletionItem[], // Full completion list.
    recommendations: string[], // Recommentations from the IC model.
    applied: string[], // Recommendations applied to the completion list.
    targetTypeName: string | undefined, // Type of editor invocation.
    modelVersion: string, // Version of the model.
    elapsedMs: number, // Time takes to gather recommendations.
    memoryIncrease: number // Change in memory consumption.
): void {
    const te = new TelemetryEvent(TelemetryEventName.INTELLICODE_COMPLETION_ITEM_SELECTED);

    let failureReason = FailureReason.None;
    if (recommendations.length > 0) {
        // There were recommendations, but there were no matching
        // items in the completion list.
        if (applied.length === 0) {
            failureReason = FailureReason.NotInIntersection;
        }
    } else {
        // There are completions, but nothing was recommended by the model.
        failureReason = FailureReason.NotInModel;
    }

    te.Properties['ModelType'] = ModelType.LSTM; // Deep learning with ONNX.
    te.Properties['FailureReason'] = failureReason;

    if (failureReason === FailureReason.NotInModel) {
        // Not logging class names that are not in the Pythia model for GDPR concerns.
        te.Properties['Class'] = '';
    } else {
        te.Properties['Class'] = targetTypeName || 'undefined';
    }

    te.Measurements['ElapsedTime'] = elapsedMs;
    te.Measurements['MemoryIncreaseKB'] = memoryIncrease;

    // WARNING: method names from user code are PII/User private data.
    // Make sure we ONLY send methods that are in the model, i.e. those
    // that are from public libraries!
    if (recommendations.length > 0) {
        te.Measurements['Count'] = applied.length;
        te.Properties['Methods'] = recommendations.join(',');
    } else {
        te.Measurements['Count'] = -1; // Private.
    }

    te.Properties['ModelVersion'] = `python_LSTM_${modelVersion}`;
    te.Properties['Id'] = uuidv4();
    te.Properties['Language'] = 'python';

    buildCompletionItemsTelemetry(completionList, applied, te);
}

function buildCompletionItemsTelemetry(completionList: CompletionItem[], applied: string[], te: TelemetryEvent): void {
    const sorted = completionList.sort((a, b) => {
        if (a.sortText === b.sortText || !a.sortText || !b.sortText) {
            return 0;
        }
        if (a.sortText < b.sortText) {
            return -1;
        }
        return 1;
    });

    for (let i = 0; i < sorted.length; i++) {
        const teCopy = te.clone();
        const item = sorted[i];
        teCopy.Properties['Index'] = i.toString();

        // Method names from user code are PII/User private data.
        // We can only send methods that are in the model (applied).
        const icItem = i < applied.length;
        if (icItem) {
            teCopy.Properties['Method'] = item.insertText ?? '';
            teCopy.Properties['IsIntelliCodeCommit'] = 'True';
        } else {
            teCopy.Properties['Method'] = '';
            teCopy.Properties['IsIntelliCodeCommit'] = 'False';
        }

        item.command = {
            title: '',
            command: Commands.intelliCodeCompletionItemCommand,
            // Each command has telemetry and data on this specific item attached.
            // Telemetry is submitted when command is executed (i.e. item commited).
            arguments: [teCopy],
        };
    }
}
