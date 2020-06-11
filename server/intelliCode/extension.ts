/*
 * extension.ts
 *
 * Language service extension implementing IntelliCode.
 */
import '../pyright/server/src/common/extensions';

import { CancellationToken, CompletionItem, CompletionList } from 'vscode-languageserver';

import { ConfigOptions } from '../pyright/server/src/common/configOptions';
import { assert } from '../pyright/server/src/common/debug';
import { CompletionListExtension, LanguageServiceExtension } from '../pyright/server/src/common/extensibility';
import { FileSystem } from '../pyright/server/src/common/fileSystem';
import { Duration } from '../pyright/server/src/common/timing';
import { ModuleNode } from '../pyright/server/src/parser/parseNodes';
import { Commands, IntelliCodeCompletionCommandPrefix } from '../src/commands/commands';
import { LogLevel, LogService } from '../src/common/logger';
import { Platform } from '../src/common/platform';
import { TelemetryEvent, TelemetryEventName, TelemetryService } from '../src/common/telemetry';
import { AssignmentWalker } from './assignmentWalker';
import { DeepLearning } from './deepLearning';
import { ExpressionWalker } from './expressionWalker';
import { ModelLoader } from './modelLoader';
import { PythiaModel } from './models';
import { buildRecommendationsTelemetry } from './telemetry';
import { IntelliCodeConstants } from './types';
import { getZip } from './zip';

export class IntelliCodeExtension implements LanguageServiceExtension {
    private _icCompletionExtension: IntelliCodeCompletionListExtension;
    private _telemetry: TelemetryService;
    private _startup = true;

    get completionListExtension(): CompletionListExtension {
        return this._icCompletionExtension;
    }

    initialize(
        logger: LogService,
        telemetry: TelemetryService,
        fs: FileSystem,
        platform: Platform,
        modelUnpackFolder: string
    ): void {
        this._telemetry = telemetry;
        this._icCompletionExtension = new IntelliCodeCompletionListExtension(
            logger,
            fs,
            platform,
            telemetry,
            modelUnpackFolder
        );
    }

    updateSettings(enable: boolean): void {
        const wasEnabled = this._icCompletionExtension.enabled;
        this._icCompletionExtension
            .updateSettings(enable)
            .finally(() => {
                if (this._startup || wasEnabled !== enable) {
                    this._startup = false;
                    const event = new TelemetryEvent(TelemetryEventName.INTELLICODE_ENABLED);
                    event.Properties['enabled'] = `${enable}`;
                    event.Properties['startup'] = `${this._startup}`;
                    this._telemetry.sendTelemetry(event);
                }
            })
            .ignoreErrors();
    }
}

export class IntelliCodeCompletionListExtension implements CompletionListExtension {
    private _deepLearning: DeepLearning | undefined;
    private _enable = true;
    private _modelZipPath: string;

    constructor(
        private readonly _logger: LogService,
        private readonly _fs: FileSystem,
        private readonly _platform: Platform,
        private readonly _telemetry: TelemetryService,
        private readonly _modelUnpackFolder: string
    ) {}

    // Public for test access
    model: PythiaModel | undefined;

    get enabled(): boolean {
        return this._enable;
    }

    async updateSettings(enable: boolean): Promise<void> {
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
        if (enable && this._modelZipPath) {
            await this.loadModel();
        } else {
            this._deepLearning = undefined;
            this.model = undefined;
        }
    }

    async updateCompletionList(
        completionList: CompletionList,
        ast: ModuleNode,
        content: string,
        position: number,
        options: ConfigOptions,
        token: CancellationToken
    ): Promise<CompletionList> {
        if (!this._enable || !this.model || !this._deepLearning || completionList.items.length === 0) {
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
            const result = await this._deepLearning.getRecommendations(content, ast, ew, position, token);
            if (result.recommendations.length > 0) {
                this._logger?.log(LogLevel.Trace, `Recommendations: ${result.recommendations.join(', ')}`);
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

            let applied: string[] = [];
            if (result.recommendations.length > 0) {
                applied = this.applyModel(completionItems, result.recommendations);
            }

            buildRecommendationsTelemetry(
                completionItems,
                result.recommendations,
                applied,
                result.invocation?.type,
                this.model.metaData.Version,
                dt.getDurationInMilliseconds(),
                memoryIncrease
            );
        } catch (e) {
            this._logger?.log(LogLevel.Error, `Exception in IntelliCode: ${e.stack}`);
        }
        return completionList;
    }

    // Prefix to tell extension commands from others.
    // For example, 'myextension'. Command name then
    // should be 'myextension.command'.
    get commandPrefix(): string {
        return IntelliCodeCompletionCommandPrefix;
    }

    // Extension executes command attached to commited
    // completion list item, if any.
    async executeCommand(command: string, args: any[] | undefined, token: CancellationToken): Promise<void> {
        switch (command) {
            case Commands.intelliCodeCompletionItemCommand:
                assert(args?.length === 1);
                if (args?.length === 1) {
                    const te = args[0] as TelemetryEvent;
                    this._telemetry.sendTelemetry(te);
                    return Promise.resolve();
                }
                break;
            case Commands.intelliCodeLoadExtension:
                assert(Array.isArray(args));
                assert(args?.length === 1);
                if (args?.length === 1) {
                    assert(args[0]);
                    const modelZipPath = args[0].modelPath;
                    assert(typeof modelZipPath === 'string');
                    if (typeof modelZipPath === 'string') {
                        this._logger?.log(LogLevel.Trace, `IntelliCode model ${modelZipPath}`);
                        this._modelZipPath = modelZipPath;
                        if (this.enabled) {
                            return this.loadModel();
                        }
                    }
                }
                break;
        }
    }

    // Takes source list of completions and supplied recommentations, then modifies
    // completion list in place, adding '*' to recommended items from the source list
    // and specifying sorting order in such a way so recommended items appear on top.
    // Returns number of items applied from recommentations.
    private applyModel(completions: CompletionItem[], recommendations: string[]): string[] {
        const applied: string[] = [];
        const set = new Map<string, CompletionItem>(
            completions.filter((x) => x.label).map((v) => [v.label, v] as [string, CompletionItem])
        );

        let count = 0;
        for (const r of recommendations) {
            const completionItem = set.get(r);
            if (completionItem) {
                this.updateCompletionItem(completionItem, count);
                if (completionItem.insertText) {
                    applied.push(completionItem.insertText);
                }
                if (count >= IntelliCodeConstants.MaxRecommendation) {
                    break;
                }
                count++;
            }
        }
        return applied;
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

    private async loadModel(): Promise<void> {
        if (!this.enabled || this.model || !this._modelZipPath) {
            return;
        }
        try {
            const loader = new ModelLoader(this._fs, getZip(this._fs), this._logger);
            this.model = await loader.loadModel(this._modelZipPath, this._modelUnpackFolder);

            if (this.model) {
                if (!this._deepLearning) {
                    this._deepLearning = new DeepLearning(this.model, this._platform, this._logger);
                }
                await this._deepLearning.initialize();
            }
        } catch (e) {
            this._logger.log(LogLevel.Warning, `Failed to load IntelliCode model. Exception: ${e.stack}`);
        }
    }
}
