/*
 * extension.ts
 *
 * Language service extension implementing IntelliCode.
 */

import { CompletionItem, CompletionList } from 'vscode-languageserver';

import { ConfigOptions } from '../pyright/server/src/common/configOptions';
import { createDeferred } from '../pyright/server/src/common/deferred';
import { CompletionListExtension, LanguageServiceExtension } from '../pyright/server/src/common/extensibility';
import { FileSystem } from '../pyright/server/src/common/fileSystem';
import { Duration } from '../pyright/server/src/common/timing';
import { ModuleNode } from '../pyright/server/src/parser/parseNodes';
import { LogLevel, LogService } from '../src/common/logger';
import { sendExceptionTelemetry, TelemetryEventName, TelemetryService } from '../src/common/telemetry';
import { AssignmentWalker } from './assignmentWalker';
import { DeepLearning } from './deepLearning';
import { ExpressionWalker } from './expressionWalker';
import { ModelLoader } from './modelLoader';
import { PythiaModel } from './models';
// import { buildRecommendationsTelemetry } from './telemetry';
import { IntelliCodeConstants } from './types';
import { getZip } from './zip';

const RecommendationLimit = 5;

export class IntelliCodeExtension implements LanguageServiceExtension {
    private _icCompletionExtension: IntelliCodeCompletionListExtension;

    get completionListExtension(): CompletionListExtension {
        return this._icCompletionExtension;
    }

    initialize(logger: LogService, telemetry: TelemetryService, fs: FileSystem): void {
        this._icCompletionExtension = new IntelliCodeCompletionListExtension(logger, telemetry, fs);
    }
    enable(enable: boolean): void {
        this._icCompletionExtension.enable(enable);
    }
}

export class IntelliCodeCompletionListExtension implements CompletionListExtension {
    private _model: PythiaModel | undefined;
    private _deepLearning: DeepLearning | undefined;
    private _enable = true;
    private _failedToDownloadModel = false;

    constructor(
        private readonly _logger: LogService,
        private readonly _telemetry: TelemetryService,
        private readonly _fs: FileSystem
    ) {}

    enable(enable: boolean): Promise<boolean> {
        // First 'enable' comes when settings are retrieved after LS initialization.
        // When IntelliCode is not enabled, do nothing. If IntelliCode is enabled,
        // but model has not been downloaded yet or deep learning engine has not been
        // created, proceed with its creation. If we already tried to download model
        // and failed, do nothing.
        this._enable = enable;
        if (!enable || (enable && this._model && this._deepLearning) || this._failedToDownloadModel) {
            return Promise.resolve(true);
        }

        const deferred = createDeferred<boolean>();
        const loader = new ModelLoader(this._fs, getZip(this._fs), this._logger, this._telemetry);
        loader
            .loadModel(this._fs.getModulePath())
            .then((m) => {
                // TODO: Restore when ONNX Runtime is ready.
                // this._model = m;
                this._deepLearning = new DeepLearning(this._logger);
                deferred.resolve(true);
            })
            .catch((e) => {
                // TODO: Restore when ONNX Runtime is ready.
                // sendExceptionTelemetry(this._telemetry, TelemetryEventName.EXCEPTION_IC, e);
                this._logger.log(LogLevel.Warning, `Failed to download IntelliCode data. Exception: ${e.message}`);
                this._failedToDownloadModel = true;
                deferred.resolve(false);
            });
        return deferred.promise;
    }

    updateCompletionList(
        completionList: CompletionList,
        ast: ModuleNode,
        content: string,
        position: number,
        options: ConfigOptions
    ): CompletionList {
        if (!this._enable || !this._model || !this._deepLearning || completionList.items.length === 0) {
            return completionList;
        }

        try {
            const dt = new Duration();
            const memoryUsedBeforeInference = process.memoryUsage().heapUsed / 1024;

            const aw = new AssignmentWalker(ast);
            aw.walk(ast);
            const ew = new ExpressionWalker(aw.scopes);
            ew.walk(ast);

            const completionItems = completionList.items;
            const recommendations = this._deepLearning.getRecommendations(content, ast, ew, position);
            this._logger?.log(LogLevel.Trace, `Recommendations: ${recommendations.join(', ')}`);

            const memoryUsedAfterInference = process.memoryUsage().heapUsed / 1024;
            const memoryIncrease = memoryUsedAfterInference - memoryUsedBeforeInference;
            this._logger?.log(
                LogLevel.Trace,
                `Time taken to get recommendations: ${dt.getDurationInMilliseconds()} ms, Memory increase: ${memoryIncrease} KB.`
            );

            if (recommendations.length > 0) {
                // applied =
                this.applyModel(completionItems, recommendations);
            }
            // this._telemetry.sendTelemetry(
            //     buildRecommendationsTelemetry(
            //         completionItems,
            //         recommendations,
            //         applied,
            //         this._deepLearning.lastInvocation?.type,
            //         ModelType.LSTM,
            //         dt.getDurationInMilliseconds(),
            //         memoryIncrease
            //     )
            // );

            return completionList;
        } catch (e) {
            sendExceptionTelemetry(this._telemetry, TelemetryEventName.EXCEPTION_IC, e);
        }
        return completionList;
    }

    // Takes source list of completions and supplied recommentations, then modifies
    // completion list in place, adding '*' to recommended items from the source list
    // and specifying sorting order in such a way so recommended items appear on top.
    // Returns number of items applied from recommentations.
    private applyModel(completions: CompletionItem[], recommendations: string[]): number {
        const set = new Map<string, CompletionItem>(
            completions.filter((x) => x.insertText).map((v) => [v.insertText, v] as [string, CompletionItem])
        );

        let count = 0;
        for (const r of recommendations) {
            const completionItem = set.get(r);
            if (completionItem) {
                this.updateCompletionItem(completionItem, count);
                if (count >= RecommendationLimit) {
                    break;
                }
                count++;
            }
        }
        return count;
    }

    private updateCompletionItem(item: CompletionItem, rank: number): void {
        if (!item.filterText || item.filterText.length === 0) {
            item.filterText = item.insertText;
        }

        item.label = `${IntelliCodeConstants.UnicodeStar}${item.label}`;
        item.sortText = `0.${rank}`;
        item.preselect = rank === 0;
    }
}
