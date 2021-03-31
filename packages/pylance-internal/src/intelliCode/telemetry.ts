/*
 * telemetry.ts
 *
 * IntelliCode telemetry.
 */
import { CompletionItem } from 'vscode-languageserver';

import { Duration } from 'pyright-internal/common/timing';
import { ExtensionInfo } from 'pyright-internal/languageService/completionProvider';

import { Commands } from '../commands/commands';
import { mergeCommands } from '../commands/multiCommand';
import {
    createTelemetryCorrelationId,
    TelemetryEvent,
    TelemetryEventName,
    TelemetryService,
} from '../common/telemetry';
import { FailureReason, ModelType } from './types';

type IntelliCodeStatData = {
    failureReason: FailureReason;
    modelType: ModelType;
    class: string;
    elapsedTime: number;
    memoryIncreaseKB: number;
    count: number;
    methods: string;
    modelVersion: string;
    id: string;
    language: string;
};

// This depends on the fact that there can be only 1 completion session going at a time.
let _lastStateData: IntelliCodeStatData | undefined;

function createTelemetry(correlationId: string) {
    if (_lastStateData?.id !== correlationId) {
        return;
    }

    const event = new TelemetryEvent(TelemetryEventName.INTELLICODE_COMPLETION_ITEM_SELECTED);

    event.Properties['Id'] = _lastStateData.id;
    event.Properties['Language'] = _lastStateData.language;

    event.Properties['ModelType'] = _lastStateData.modelType;
    event.Properties['ModelVersion'] = _lastStateData.modelVersion;
    event.Properties['FailureReason'] = _lastStateData.failureReason;

    event.Properties['Class'] = _lastStateData.class;
    event.Measurements['ElapsedTime'] = _lastStateData.elapsedTime;
    event.Measurements['MemoryIncreaseKB'] = _lastStateData.memoryIncreaseKB;

    event.Measurements['Count'] = _lastStateData.count;
    event.Properties['Methods'] = _lastStateData.methods;

    return event;
}

export function sendRecommendationsTelemetry(
    service: TelemetryService,
    id: string,
    args?: { index: string; method: string }
) {
    const event = createTelemetry(id);
    if (!event) {
        return;
    }

    if (args) {
        event.Properties['Index'] = args.index;
        event.Properties['Method'] = args.method;
        event.Properties['IsIntelliCodeCommit'] = 'True';
    } else {
        // Index has no meaning when IsIntelliCodeCommit is False
        event.Properties['Index'] = '-1';
        event.Properties['Method'] = '';
        event.Properties['IsIntelliCodeCommit'] = 'False';
    }

    service.sendTelemetry(event);
}

// Builds overall IntelliCode telemetry
export function buildRecommendationsTelemetry(
    completionList: CompletionItem[], // Full completion list.
    recommendations: string[], // Recommendations from the IC model.
    applied: string[], // Recommendations applied to the completion list.
    targetTypeName: string | undefined, // Type of editor invocation.
    modelVersion: string, // Version of the model.
    elapsedMs: number, // Time takes to gather recommendations.
    memoryIncrease: number // Change in memory consumption.
): ExtensionInfo {
    const id = createTelemetryCorrelationId();
    const duration = new Duration();

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

    // Not logging class names that are not in the Pythia model for GDPR concerns.
    let className = '';
    if (failureReason !== FailureReason.NotInModel) {
        className = targetTypeName || 'undefined';
    }

    let count = -1;
    let methods = '';
    if (recommendations.length > 0) {
        count = applied.length;
        methods = recommendations.join(',');
    }

    // Save the last intellicode statistic data in memory
    // so that we can send this along with other data when
    // completion is commited.
    _lastStateData = {
        id: id,
        language: 'python',
        modelType: ModelType.LSTM, // Deep learning with ONNX.
        modelVersion: `python_LSTM_${modelVersion}`,
        failureReason,
        class: className,
        elapsedTime: elapsedMs,
        memoryIncreaseKB: memoryIncrease,
        count,
        methods,
    };

    const telemetryBuildTimeInMS = duration.getDurationInMilliseconds();
    buildCompletionItemsTelemetry(id, completionList, applied);

    const telemetryBuildTimeDoneInMS = duration.getDurationInMilliseconds();
    return {
        correlationId: id,
        selectedItemTelemetryTimeInMS: telemetryBuildTimeInMS,
        itemTelemetryTimeInMS: telemetryBuildTimeDoneInMS - telemetryBuildTimeInMS,
        totalTimeInMS: elapsedMs + telemetryBuildTimeDoneInMS,
    };
}

function buildCompletionItemsTelemetry(id: string, completionList: CompletionItem[], applied: string[]): void {
    const sorted = completionList.sort((a, b) => {
        if (a.sortText === b.sortText || !a.sortText || !b.sortText) {
            return 0;
        }
        if (a.sortText < b.sortText) {
            return -1;
        }
        return 1;
    });

    const noRecommendCommand = {
        title: '',
        command: Commands.intelliCodeCompletionItemCommand,
        arguments: [id],
    };

    for (let i = 0; i < sorted.length; i++) {
        const item = sorted[i];

        // Method names from user code are PII/User private data.
        // We can only send methods that are in the model (applied).
        // Each command has telemetry and data on this specific item attached.
        // Telemetry is submitted when command is executed (i.e. item commited).
        const icItem = i < applied.length;
        if (icItem) {
            item.command = mergeCommands(item.command, {
                title: '',
                command: Commands.intelliCodeCompletionItemCommand,
                arguments: [id, i, item.insertText ?? ''],
            });
        } else {
            item.command = mergeCommands(item.command, noRecommendCommand);
        }
    }
}
