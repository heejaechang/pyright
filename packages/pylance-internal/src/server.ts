/*
 * server.ts
 *
 * Implements Pylance language server.
 */

import * as path from 'path';
import {
    CancellationToken,
    CodeAction,
    CodeActionKind,
    CodeActionParams,
    Command,
    CompletionItem,
    CompletionItemKind,
    CompletionList,
    CompletionParams,
    ExecuteCommandParams,
    InitializeParams,
    InitializeResult,
    InsertTextFormat,
    Position,
    SemanticTokens,
    SemanticTokensDelta,
    SemanticTokensDeltaParams,
    SemanticTokensParams,
    SemanticTokensRangeParams,
    SemanticTokensRefreshRequest,
    WorkspaceFolder,
} from 'vscode-languageserver/node';
import { isMainThread } from 'worker_threads';

import { AnalysisResults } from 'pyright-internal/analyzer/analysis';
import { BackgroundAnalysisProgram } from 'pyright-internal/analyzer/backgroundAnalysisProgram';
import { ImportResolver } from 'pyright-internal/analyzer/importResolver';
import { MaxAnalysisTime } from 'pyright-internal/analyzer/program';
import { isPythonBinary } from 'pyright-internal/analyzer/pythonPathUtils';
import { BackgroundAnalysisBase } from 'pyright-internal/backgroundAnalysisBase';
import { Commands as PyRightCommands } from 'pyright-internal/commands/commands';
import { getCancellationFolderName } from 'pyright-internal/common/cancellationUtils';
import { ConfigOptions } from 'pyright-internal/common/configOptions';
import { ConsoleInterface, ConsoleWithLogLevel, LogLevel } from 'pyright-internal/common/console';
import { isString } from 'pyright-internal/common/core';
import * as debug from 'pyright-internal/common/debug';
import { LanguageServiceExtension } from 'pyright-internal/common/extensibility';
import { createFromRealFileSystem, FileSystem } from 'pyright-internal/common/fileSystem';
import * as consts from 'pyright-internal/common/pathConsts';
import { convertUriToPath, resolvePaths } from 'pyright-internal/common/pathUtils';
import { ProgressReporter } from 'pyright-internal/common/progressReporter';
import { Range } from 'pyright-internal/common/textRange';
import {
    LanguageServerBase,
    ProgressReporterConnection,
    ServerSettings,
    WorkspaceServiceInstance,
} from 'pyright-internal/languageServerBase';
import { CodeActionProvider as PyrightCodeActionProvider } from 'pyright-internal/languageService/codeActionProvider';
import { CompletionItemData, CompletionResults } from 'pyright-internal/languageService/completionProvider';

import { BackgroundAnalysis, runBackgroundThread } from './backgroundAnalysis';
import { CommandController } from './commands/commandController';
import { Commands } from './commands/commands';
import { mergeCommands } from './commands/multiCommand';
import { IS_PRERELEASE, PYRIGHT_COMMIT, VERSION } from './common/constants';
import { wellKnownAbbreviationMap } from './common/importUtils';
import { LogService } from './common/logger';
import { Platform } from './common/platform';
import {
    addMeasurementsToEvent,
    addNativeModuleInfoToEvent,
    CompletionCoverage,
    StubTelemetry,
    TelemetryEvent,
    TelemetryEventName,
    TelemetryService,
    trackPerf,
} from './common/telemetry';
import { IntelliCodeExtension } from './intelliCode/extension';
import { ModelSubFolder } from './intelliCode/models';
import { prepareNativesForCurrentPlatform } from './intelliCode/nativeInit';
import { CodeActionProvider as PylanceCodeActionProvider } from './languageService/codeActionProvider';
import { getSemanticTokens, SemanticTokenProvider } from './languageService/semanticTokenProvider';
import { createPylanceImportResolver, PylanceImportResolver } from './pylanceImportResolver';
import { AnalysisTracker } from './services/analysisTracker';

const pythonSectionName = 'python';
const pythonAnalysisSectionName = 'python.analysis';

export interface PylanceServerSettings extends ServerSettings {
    completeFunctionParens?: boolean;
    enableExtractCodeAction?: boolean;
}
export interface PylanceWorkspaceServiceInstance extends WorkspaceServiceInstance {
    completeFunctionParens?: boolean;
    enableExtractCodeAction?: boolean;
}

class PylanceServer extends LanguageServerBase {
    private _controller: CommandController;
    private _analysisTracker: AnalysisTracker;
    private _completionCoverage: CompletionCoverage.CompletionTelemetry;
    private _telemetry: TelemetryService;
    private _logger: LogService;
    private _platform: Platform;
    private _intelliCode: IntelliCodeExtension;
    // TODO: the following settings are cached in getSettings() while they may be
    // set per workspace or folder. Figure out how can we maintain cache per resource.
    private _progressBarEnabled?: boolean;
    private _hasSemanticTokensRefreshCapability?: boolean;

    constructor() {
        const rootDirectory = __dirname;
        // IntelliCode needs to be passed down as extension to the language server
        // but it cannot be initialized here as super() was not called yet.
        const intelliCode = new IntelliCodeExtension();
        super({
            productName: 'Pylance',
            rootDirectory,
            version: `${VERSION} (pyright ${PYRIGHT_COMMIT.substring(0, 8)})`,
            extension: intelliCode,
            supportedCommands: CommandController.supportedCommands(),
            progressReporterFactory: reporterFactory,
            supportedCodeActions: [CodeActionKind.QuickFix, CodeActionKind.RefactorExtract],
        });

        // root directory will be used for 2 different purpose.
        // 1. to find "typeshed-fallback" folder.
        // 2. to set "cwd" to run python to find search path.
        debug.assert(
            this.fs.existsSync(path.join(rootDirectory, consts.typeshedFallback)),
            `Unable to locate typeshed fallback folder at '${rootDirectory}'`
        );
        this._analysisTracker = new AnalysisTracker();
        this._telemetry = new TelemetryService(this._connection as any);
        this._controller = new CommandController(this, this._telemetry);
        this._completionCoverage = new CompletionCoverage.CompletionTelemetry(this._telemetry);
        this._logger = new LogService(this.console as ConsoleWithLogLevel);
        this._platform = new Platform();

        // IntelliCode may be enabled or disabled depending on user settings.
        // We don't know the state here since settings haven't been accessed yet.
        this._intelliCode = intelliCode;
        // Initialize IntelliCode. This does not start it since it needs path
        // to the model which will come later from the IntelliCode extension.
        const icModelSubfolder = path.join(this.fs.getModulePath(), ModelSubFolder);
        this._intelliCode.initialize(this._logger, this._telemetry, this.fs, this._platform, icModelSubfolder);

        const server = this;
        function reporterFactory(connection: ProgressReporterConnection): ProgressReporter {
            return {
                isEnabled(data: AnalysisResults): boolean {
                    return !!server._progressBarEnabled;
                },

                begin(): void {
                    connection.sendNotification('python/beginProgress');
                },

                report(message: string): void {
                    connection.sendNotification('python/reportProgress', message);
                },

                end(): void {
                    connection.sendNotification('python/endProgress');
                },
            };
        }
    }

    async getSettings(workspace: WorkspaceServiceInstance): Promise<ServerSettings> {
        const serverSettings: PylanceServerSettings = {
            autoSearchPaths: true,
            disableLanguageServices: false,
            openFilesOnly: true,
            useLibraryCodeForTypes: true,
            watchForSourceChanges: true,
            watchForLibraryChanges: true,
            typeCheckingMode: 'off',
            diagnosticSeverityOverrides: {},
            logLevel: LogLevel.Info,
            autoImportCompletions: true,
            indexing: IS_PRERELEASE,
            completeFunctionParens: false,
            enableExtractCodeAction: false,
        };

        let forceProgressBar = false;

        try {
            const pythonSection = await this.getConfiguration(workspace.rootUri, pythonSectionName);
            if (pythonSection) {
                const pythonPath = pythonSection.pythonPath;
                if (pythonPath && isString(pythonPath) && !isPythonBinary(pythonPath)) {
                    serverSettings.pythonPath = resolvePaths(workspace.rootPath, pythonPath);
                }

                const venvPath = pythonSection.venvPath;
                if (venvPath && isString(venvPath)) {
                    serverSettings.venvPath = resolvePaths(workspace.rootPath, venvPath);
                }
            }

            const pythonAnalysisSection = await this.getConfiguration(workspace.rootUri, pythonAnalysisSectionName);
            if (pythonAnalysisSection) {
                const typeshedPaths = pythonAnalysisSection.typeshedPaths;
                if (typeshedPaths && Array.isArray(typeshedPaths) && typeshedPaths.length > 0) {
                    const typeshedPath = typeshedPaths[0];
                    if (typeshedPath && isString(typeshedPath)) {
                        serverSettings.typeshedPath = resolvePaths(workspace.rootPath, typeshedPath);
                    }
                }

                const stubPath = pythonAnalysisSection.stubPath;
                if (stubPath && isString(stubPath)) {
                    serverSettings.stubPath = resolvePaths(workspace.rootPath, stubPath);
                }

                const diagnosticSeverityOverrides = pythonAnalysisSection.diagnosticSeverityOverrides;
                if (diagnosticSeverityOverrides) {
                    for (const [name, value] of Object.entries(diagnosticSeverityOverrides)) {
                        const ruleName = this.getDiagnosticRuleName(name);
                        const severity = this.getSeverityOverrides(value as string);
                        if (ruleName && severity) {
                            serverSettings.diagnosticSeverityOverrides![ruleName] = severity!;
                        }
                    }
                }

                serverSettings.logLevel = this.convertLogLevel(pythonAnalysisSection.logLevel);
                serverSettings.openFilesOnly = this.isOpenFilesOnly(pythonAnalysisSection.diagnosticMode);
                serverSettings.useLibraryCodeForTypes =
                    pythonAnalysisSection.useLibraryCodeForTypes ?? serverSettings.useLibraryCodeForTypes;
                serverSettings.autoSearchPaths =
                    pythonAnalysisSection.autoSearchPaths ?? serverSettings.autoSearchPaths;
                serverSettings.typeCheckingMode =
                    pythonAnalysisSection.typeCheckingMode ?? serverSettings.typeCheckingMode;

                const extraPaths = pythonAnalysisSection.extraPaths;
                if (extraPaths && Array.isArray(extraPaths) && extraPaths.length > 0) {
                    serverSettings.extraPaths = extraPaths
                        .filter((p) => p && isString(p))
                        .map((p) => resolvePaths(workspace.rootPath, p));
                }

                serverSettings.autoImportCompletions =
                    pythonAnalysisSection.autoImportCompletions ?? serverSettings.autoImportCompletions;
                serverSettings.completeFunctionParens =
                    pythonAnalysisSection.completeFunctionParens ?? serverSettings.completeFunctionParens;
                serverSettings.indexing = pythonAnalysisSection.indexing ?? serverSettings.indexing;
                serverSettings.enableExtractCodeAction =
                    pythonAnalysisSection.enableExtractCodeAction ?? serverSettings.enableExtractCodeAction;

                forceProgressBar = !!pythonAnalysisSection._forceProgressBar;
            }
        } catch (error) {
            this.console.error(`Error reading settings: ${error}`);
        }

        // If typeCheckingMode is not 'off' or if there is any custom rule enabled, then progress bar is enabled.
        this._progressBarEnabled =
            forceProgressBar ||
            serverSettings.typeCheckingMode !== 'off' ||
            Object.values(serverSettings.diagnosticSeverityOverrides!).some((v) => v !== 'none');

        return serverSettings;
    }

    createBackgroundAnalysis(): BackgroundAnalysisBase | undefined {
        if (!getCancellationFolderName()) {
            // old client. it doesn't support cancellation.
            return undefined;
        }

        return new BackgroundAnalysis(this._telemetry, this.console);
    }

    updateSettingsForAllWorkspaces(): void {
        this._updateGlobalSettings().ignoreErrors();
        super.updateSettingsForAllWorkspaces();
        if (this._hasSemanticTokensRefreshCapability) {
            this._connection.sendRequest(SemanticTokensRefreshRequest.method).ignoreErrors();
        }
    }

    protected initialize(
        params: InitializeParams,
        supportedCommands: string[],
        supportedCodeActions: string[]
    ): InitializeResult {
        const result = super.initialize(params, supportedCommands, supportedCodeActions);

        const clientSemanticTokensCaps = params.capabilities.textDocument?.semanticTokens;
        if (clientSemanticTokensCaps) {
            const tokenLegend = SemanticTokenProvider.computeLegend(clientSemanticTokensCaps);

            result.capabilities.semanticTokensProvider = {
                legend: tokenLegend,
                range: true,
                full: {
                    delta: true,
                },
            };

            this._hasSemanticTokensRefreshCapability = !!params.capabilities.workspace?.semanticTokens?.refreshSupport;
        }

        return result;
    }

    protected setupConnection(supportedCommands: string[], supportedCodeActions: string[]): void {
        super.setupConnection(supportedCommands, supportedCodeActions);

        this._connection.languages.semanticTokens.on(
            async (params: SemanticTokensParams, token: CancellationToken): Promise<SemanticTokens> => {
                const filePath = convertUriToPath(params.textDocument.uri);

                const workspace = await this.getWorkspaceForFile(filePath);
                if (workspace.disableLanguageServices) {
                    return { data: [] };
                }

                const tokens = await this._getBackgroundAnalysisProgram(workspace).getSemanticTokens(
                    filePath,
                    undefined,
                    undefined,
                    token
                );

                return tokens;
            }
        );

        this._connection.languages.semanticTokens.onDelta(
            async (
                params: SemanticTokensDeltaParams,
                token: CancellationToken
            ): Promise<SemanticTokens | SemanticTokensDelta> => {
                const filePath = convertUriToPath(params.textDocument.uri);

                const workspace = await this.getWorkspaceForFile(filePath);
                if (workspace.disableLanguageServices) {
                    return { data: [] };
                }

                const tokens = await this._getBackgroundAnalysisProgram(workspace).getSemanticTokens(
                    filePath,
                    undefined,
                    params.previousResultId,
                    token
                );

                return tokens;
            }
        );

        this._connection.languages.semanticTokens.onRange(
            async (params: SemanticTokensRangeParams, token: CancellationToken): Promise<SemanticTokens> => {
                const filePath = convertUriToPath(params.textDocument.uri);

                const workspace = await this.getWorkspaceForFile(filePath);
                if (workspace.disableLanguageServices) {
                    return { data: [] };
                }

                const tokens = await this._getBackgroundAnalysisProgram(workspace).getSemanticTokens(
                    filePath,
                    params.range,
                    undefined,
                    token
                );

                return tokens;
            }
        );
    }

    protected createBackgroundAnalysisProgram(
        console: ConsoleInterface,
        configOptions: ConfigOptions,
        importResolver: ImportResolver,
        extension?: LanguageServiceExtension,
        backgroundAnalysis?: BackgroundAnalysisBase,
        maxAnalysisTime?: MaxAnalysisTime
    ): BackgroundAnalysisProgram {
        return new PylanceBackgroundAnalysisProgram(
            console,
            configOptions,
            importResolver,
            extension,
            backgroundAnalysis,
            maxAnalysisTime
        );
    }

    protected isLongRunningCommand(command: string): boolean {
        // We should determine which commands are actually slow
        // rather assuming they are all slow wholesale.
        switch (command) {
            case Commands.createTypeStub:
            case PyRightCommands.createTypeStub:
            case PyRightCommands.restartServer:
                return true;
        }
        return false;
    }

    protected executeCommand(params: ExecuteCommandParams, token: CancellationToken): Promise<any> {
        if (params.command.startsWith(this._intelliCode.completionListExtension.commandPrefix)) {
            return this._intelliCode.completionListExtension.executeCommand(params.command, params.arguments, token);
        }
        return this._controller.execute(params, token);
    }

    protected createImportResolver(fs: FileSystem, options: ConfigOptions): ImportResolver {
        const resolver = createPylanceImportResolver(fs, options);

        resolver.setStubUsageCallback((importMetrics) => {
            if (!importMetrics.isEmpty()) {
                this._telemetry?.sendMeasurementsTelemetry(TelemetryEventName.IMPORT_METRICS, importMetrics);
            }
        });

        return resolver;
    }

    protected async executeCodeAction(
        params: CodeActionParams,
        token: CancellationToken
    ): Promise<(Command | CodeAction)[] | undefined | null> {
        this.recordUserInteractionTime();

        const filePath = convertUriToPath(params.textDocument.uri);
        const workspace = (await this.getWorkspaceForFile(filePath)) as PylanceWorkspaceServiceInstance;
        const actions1 = await PyrightCodeActionProvider.getCodeActionsForPosition(
            workspace,
            filePath,
            params.range,
            token
        );

        const actions2 = await PylanceCodeActionProvider.getCodeActionsForPosition(
            workspace,
            filePath,
            params.range,
            token
        );

        return [...actions1, ...actions2];
    }

    protected async getWorkspaceCompletionsForPosition(
        workspace: WorkspaceServiceInstance,
        filePath: string,
        position: Position,
        workspacePath: string,
        token: CancellationToken
    ): Promise<CompletionResults | undefined> {
        const results = await trackPerf(
            this._telemetry,
            TelemetryEventName.COMPLETION_SLOW,
            async (cm) => {
                const completionResults = await workspace.serviceInstance.getCompletionsForPosition(
                    filePath,
                    position,
                    workspacePath,
                    this._completionDocFormat,
                    wellKnownAbbreviationMap,
                    token
                );

                cm.addCustomMeasure('completionItems', completionResults?.completionList?.items.length ?? -1);
                return completionResults;
            },
            1000
        );

        StubTelemetry.sendStubCompletionTelemetryForMissingTypes(results, this._telemetry);
        this._completionCoverage.update(results);

        return results;
    }

    protected onAnalysisCompletedHandler(results: AnalysisResults): void {
        super.onAnalysisCompletedHandler(results);

        if (results.error) {
            this._telemetry.sendExceptionTelemetry(TelemetryEventName.ANALYSIS_EXCEPTION, results.error);
        }

        if (results.diagnostics.length === 0 && results.filesRequiringAnalysis > 0 && results.elapsedTime === 0) {
            // This is not from actual analysis
            return;
        }

        this.sendTelemetry(results);
    }

    protected async onCompletion(
        params: CompletionParams,
        token: CancellationToken
    ): Promise<CompletionList | undefined> {
        const completionList = await super.onCompletion(params, token);
        const workspace = (await this.getWorkspaceForFile(
            convertUriToPath(params.textDocument.uri)
        )) as PylanceWorkspaceServiceInstance;

        if (completionList && this._hasVisualStudioExtensionsCapability) {
            // See this for the unicode designations as understood by Visual Studio:
            // https://docs.microsoft.com/en-us/dotnet/api/system.globalization.unicodecategory
            // Any characters not in those classes will cause VS to dismiss the completion list.
            const designations = ['Lu', 'Ll', 'Lt', 'Lm', 'Lo', 'Mn', 'Mc', 'Lo', 'Me', 'Nd', 'Nl', 'No', 'Pc'];
            (completionList as any)._vsext_continueCharacters = designations.map((val) => ({
                type: 'unicodeClass',
                unicodeClass: val,
            }));
        }

        if (completionList && workspace.completeFunctionParens && !token.isCancellationRequested) {
            for (const c of completionList.items) {
                updateInsertTextForAutoParensIfNeeded(c, params.textDocument.uri);
            }
        }
        return completionList;
    }

    protected createWorkspaceServiceInstance(
        workspace: WorkspaceFolder | undefined,
        rootPath: string
    ): PylanceWorkspaceServiceInstance {
        const src = super.createWorkspaceServiceInstance(workspace, rootPath);
        return { ...src, completeFunctionParens: false, enableExtractCodeAction: false };
    }

    async updateSettingsForWorkspace(
        workspace: WorkspaceServiceInstance,
        serverSettings?: ServerSettings
    ): Promise<void> {
        serverSettings = serverSettings ?? (await this.getSettings(workspace));
        await super.updateSettingsForWorkspace(workspace, serverSettings);
        (workspace as PylanceWorkspaceServiceInstance).completeFunctionParens = !!(serverSettings as PylanceServerSettings)
            .completeFunctionParens;
        (workspace as PylanceWorkspaceServiceInstance).enableExtractCodeAction = !!(serverSettings as PylanceServerSettings)
            .enableExtractCodeAction;

        if (workspace.disableLanguageServices) {
            return;
        }
        workspace.serviceInstance.startIndexing();
    }

    private _getBackgroundAnalysisProgram(workspace: WorkspaceServiceInstance) {
        return workspace.serviceInstance.backgroundAnalysisProgram as PylanceBackgroundAnalysisProgram;
    }

    private async _updateGlobalSettings(): Promise<void> {
        const pythonAnalysis = await this.getConfiguration(undefined, pythonAnalysisSectionName);
        this._intelliCode.updateSettings(pythonAnalysis?.intelliCodeEnabled ?? true);
    }

    private sendTelemetry(results: AnalysisResults): void {
        const te = this._analysisTracker.updateTelemetry(results);
        if (!te) {
            return;
        }
        this._telemetry.sendTelemetry(te);

        //send import metrics
        let shouldSend = false;
        const importEvent = new TelemetryEvent(TelemetryEventName.IMPORT_METRICS);
        const nativeModules: Set<string> = new Set();

        this._workspaceMap.forEach((workspace) => {
            const resolver = workspace.serviceInstance.getImportResolver();
            if (resolver instanceof PylanceImportResolver) {
                if (!resolver.importMetrics.isEmpty()) {
                    addMeasurementsToEvent(importEvent, resolver.importMetrics);
                    shouldSend = true;
                }

                const nativeModuleNames = resolver.importMetrics.getAndResetNativeModuleNames();
                if (nativeModuleNames.length > 0) {
                    nativeModuleNames.forEach((m) => nativeModules.add(m));
                    shouldSend = true;
                }
            }
        });

        if (shouldSend) {
            if (nativeModules.size > 0) {
                addNativeModuleInfoToEvent(importEvent, [...nativeModules]);
            }
            this._telemetry.sendTelemetry(importEvent);
        }
    }
}

class PylanceBackgroundAnalysisProgram extends BackgroundAnalysisProgram {
    constructor(
        console: ConsoleInterface,
        configOptions: ConfigOptions,
        importResolver: ImportResolver,
        extension?: LanguageServiceExtension,
        backgroundAnalysis?: BackgroundAnalysisBase,
        maxAnalysisTime?: MaxAnalysisTime
    ) {
        super(console, configOptions, importResolver, extension, backgroundAnalysis, maxAnalysisTime);
    }

    async getSemanticTokens(
        filePath: string,
        range: Range | undefined,
        previousResultId: string | undefined,
        token: CancellationToken
    ): Promise<SemanticTokens> {
        if (this.backgroundAnalysis) {
            return (this.backgroundAnalysis as BackgroundAnalysis).getSemanticTokens(
                filePath,
                range,
                previousResultId,
                token
            );
        }

        return getSemanticTokens(this.program, filePath, range, previousResultId, token);
    }
}

export function updateInsertTextForAutoParensIfNeeded(item: CompletionItem, textDocumentUri: string) {
    const autoParenDisabledContext = (item.data as CompletionItemData)?.funcParensDisabled;
    if (autoParenDisabledContext) {
        return;
    }

    if (item.kind === CompletionItemKind.Function || item.kind === CompletionItemKind.Method) {
        if (item.textEdit) {
            item.textEdit.newText = item.textEdit.newText + '($0)';
        } else {
            item.insertText = (item.insertText ?? item.label) + '($0)';
        }

        item.insertTextFormat = InsertTextFormat.Snippet;
        item.command = mergeCommands(item.command, {
            title: '',
            command: Commands.triggerParameterHints,
            arguments: [textDocumentUri],
        });
    }
}

export function main() {
    if (isMainThread) {
        prepareNativesForCurrentPlatform(createFromRealFileSystem(), new Platform());
        new PylanceServer();
    } else {
        runBackgroundThread();
    }
}
