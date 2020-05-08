/*
 * extension.ts
 *
 * Language service extension implementing IntelliCode.
 */

import { CancellationToken, CompletionItem, CompletionList } from 'vscode-languageserver';

import { ConfigOptions } from '../pyright/server/src/common/configOptions';
import { CompletionListExtension, LanguageServiceExtension } from '../pyright/server/src/common/extensibility';
import { FileSystem } from '../pyright/server/src/common/fileSystem';
import { Duration } from '../pyright/server/src/common/timing';
import { ModuleNode } from '../pyright/server/src/parser/parseNodes';
import { LogLevel, LogService } from '../src/common/logger';
import { Platform } from '../src/common/platform';
import { sendExceptionTelemetry, TelemetryEventName, TelemetryService } from '../src/common/telemetry';
import { AssignmentWalker } from './assignmentWalker';
import { DeepLearning } from './deepLearning';
import { ExpressionWalker } from './expressionWalker';
import { ModelLoader } from './modelLoader';
import { ModelZipAcquisitionService, PythiaModel } from './models';
// import { buildRecommendationsTelemetry } from './telemetry';
import { IntelliCodeConstants } from './types';
import { getZip } from './zip';

export class IntelliCodeExtension implements LanguageServiceExtension {
    private _icCompletionExtension: IntelliCodeCompletionListExtension;

    get completionListExtension(): CompletionListExtension {
        return this._icCompletionExtension;
    }

    initialize(
        logger: LogService,
        telemetry: TelemetryService,
        fs: FileSystem,
        platform: Platform,
        mas: ModelZipAcquisitionService,
        modelUnpackFolder: string
    ): void {
        this._icCompletionExtension = new IntelliCodeCompletionListExtension(
            logger,
            telemetry,
            fs,
            platform,
            mas,
            modelUnpackFolder
        );
    }

    updateSettings(enable: boolean): void {
        this._icCompletionExtension;
        this._icCompletionExtension.updateSettings(enable).ignoreErrors();
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
        private readonly _fs: FileSystem,
        private readonly _platform: Platform,
        private readonly _mas: ModelZipAcquisitionService,
        private readonly _modelUnpackFolder: string
    ) {}

    async updateSettings(enable: boolean): Promise<boolean> {
        // First 'enable' comes when settings are retrieved after LS initialization.
        // When IntelliCode is not enabled, do nothing. If IntelliCode is enabled,
        // but model has not been downloaded yet or deep learning engine has not been
        // created, proceed with its creation. If we already tried to download model
        // and failed, do nothing.

        // Debug code - with ONNX on debugger does not always stop with '--inspect-brk'.
        // const d = createDeferred<void>();
        // setTimeout(() => {
        //     d.resolve();
        // }, 10000);
        // await d.promise;

        if (!this._platform.isOnnxSupported()) {
            enable = false; // ONNX may not be available on all platforms.
        }

        this._enable = enable;
        if (!enable || this._failedToDownloadModel) {
            this._deepLearning = undefined;
            return true;
        }

        const loader = new ModelLoader(this._fs, getZip(this._fs), this._logger, this._telemetry);
        try {
            if (!this._model) {
                this._model = await loader.loadModel(this._mas, this._modelUnpackFolder);
            }

            if (this._model) {
                if (!this._deepLearning) {
                    this._deepLearning = new DeepLearning(this._model, this._platform, this._logger, this._telemetry);
                }
                await this._deepLearning.initialize();
                return true;
            }
        } catch (e) {
            sendExceptionTelemetry(this._telemetry, TelemetryEventName.EXCEPTION_IC, e);
            this._logger.log(LogLevel.Warning, `Failed to start IntelliCode. Exception: ${e.message} in ${e.stack}`);
        }

        this._failedToDownloadModel = true;
        return false;
    }

    async updateCompletionList(
        completionList: CompletionList,
        ast: ModuleNode,
        content: string,
        position: number,
        options: ConfigOptions,
        token: CancellationToken
    ): Promise<CompletionList> {
        if (!this._enable || !this._model || !this._deepLearning || completionList.items.length === 0) {
            return completionList;
        }

        try {
            const dt = new Duration();
            const memoryBefore = process.memoryUsage().heapUsed / 1024;

            const aw = new AssignmentWalker(ast);
            aw.walk(ast);
            const ew = new ExpressionWalker(aw.scopes);
            ew.walk(ast);

            const completionItems = completionList.items;
            const recommendations = await this._deepLearning.getRecommendations(content, ast, ew, position, token);
            if (recommendations.length > 0) {
                this._logger?.log(LogLevel.Trace, `Recommendations: ${recommendations.join(', ')}`);
            }

            const memoryAfter = process.memoryUsage().heapUsed / 1024;
            const memoryIncrease = Math.round(memoryAfter - memoryBefore);
            this._logger?.log(
                LogLevel.Trace,
                `Time taken to get recommendations: ${dt.getDurationInMilliseconds()} ms, Memory increase: ${memoryIncrease} KB.`
            );

            if (token.isCancellationRequested) {
                return completionList;
            }

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
            completions.filter((x) => x.label).map((v) => [v.label, v] as [string, CompletionItem])
        );

        let count = 0;
        for (const r of recommendations) {
            const completionItem = set.get(r);
            if (completionItem) {
                this.updateCompletionItem(completionItem, count);
                if (count >= IntelliCodeConstants.MaxRecommendation) {
                    break;
                }
                count++;
            }
        }
        return count;
    }

    private updateCompletionItem(item: CompletionItem, rank: number): void {
        if (!item.insertText && !item.textEdit) {
            item.insertText = item.label;
        }
        if (!item.filterText || item.filterText.length === 0) {
            item.filterText = item.insertText || item.label;
        }

        item.label = `${IntelliCodeConstants.UnicodeStar}${item.label}`;
        item.sortText = `0.${rank}`;
        item.preselect = rank === 0;
    }
}
