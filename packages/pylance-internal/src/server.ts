/*
 * server.ts
 *
 * Implements Pylance language server.
 */

import * as path from 'path';
import {
    CancellationToken,
    CodeAction,
    CodeActionParams,
    Command,
    CompletionItem,
    CompletionItemKind,
    CompletionList,
    CompletionParams,
    Connection,
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
} from 'vscode-languageserver';

import { AnalysisResults } from 'pyright-internal/analyzer/analysis';
import { BackgroundAnalysisProgram } from 'pyright-internal/analyzer/backgroundAnalysisProgram';
import { ImportResolver } from 'pyright-internal/analyzer/importResolver';
import { MaxAnalysisTime } from 'pyright-internal/analyzer/program';
import { isPythonBinary } from 'pyright-internal/analyzer/pythonPathUtils';
import type { BackgroundAnalysisBase } from 'pyright-internal/backgroundAnalysisBase';
import { Commands as PyRightCommands } from 'pyright-internal/commands/commands';
import { getCancellationFolderName } from 'pyright-internal/common/cancellationUtils';
import { ConfigOptions } from 'pyright-internal/common/configOptions';
import { ConsoleInterface, ConsoleWithLogLevel, LogLevel } from 'pyright-internal/common/console';
import { isBoolean, isNumber, isString } from 'pyright-internal/common/core';
import * as debug from 'pyright-internal/common/debug';
import { LanguageServiceExtension } from 'pyright-internal/common/extensibility';
import { FileSystem } from 'pyright-internal/common/fileSystem';
import { Host, HostKind } from 'pyright-internal/common/host';
import * as consts from 'pyright-internal/common/pathConsts';
import { convertUriToPath, resolvePaths } from 'pyright-internal/common/pathUtils';
import { ProgressReporter } from 'pyright-internal/common/progressReporter';
import { Range } from 'pyright-internal/common/textRange';
import {
    LanguageServerBase,
    ServerOptions,
    ServerSettings,
    WorkspaceServiceInstance,
} from 'pyright-internal/languageServerBase';
import { CodeActionProvider as PyrightCodeActionProvider } from 'pyright-internal/languageService/codeActionProvider';
import {
    autoImportDetail,
    CompletionItemData,
    CompletionResults,
    dictionaryKeyDetail,
} from 'pyright-internal/languageService/completionProvider';

import type { BackgroundAnalysis, ExperimentOptions } from './backgroundAnalysis';
import { CommandController } from './commands/commandController';
import { ClientCommands, Commands } from './commands/commands';
import {
    autoImportAcceptedCommand,
    dictKeyAcceptedCommand,
    normalCompletionAcceptedCommand,
} from './commands/completionAcceptedCommand';
import { mergeCommands } from './commands/multiCommand';
import { IS_DEV, IS_INSIDERS, IS_PR } from './common/constants';
import { wellKnownAbbreviationMap } from './common/importUtils';
import { LogService } from './common/logger';
import { Platform } from './common/platform';
import {
    CompletionCoverage,
    sendExceptionTelemetry,
    StubTelemetry,
    TelemetryEvent,
    TelemetryEventName,
    TelemetryInterface,
    TelemetryService,
    trackPerf,
} from './common/telemetry';
import { CustomLSP } from './customLSP';
import type { IntelliCodeExtension } from './intelliCode/extension';
import { CodeActionProvider as PylanceCodeActionProvider } from './languageService/codeActionProvider';
import { getSemanticTokens, SemanticTokenProvider } from './languageService/semanticTokenProvider';
import { createPylanceImportResolver } from './pylanceImportResolver';
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

type BackgroundAnalysisFactory = (
    telemetry: TelemetryInterface,
    console: ConsoleInterface
) => BackgroundAnalysisBase | undefined;

export class PylanceServer extends LanguageServerBase {
    private _controller: CommandController;
    private _analysisTracker: AnalysisTracker;
    private _completionCoverage: CompletionCoverage.CompletionTelemetry;
    private _telemetry: TelemetryService;
    private _logger: LogService;
    private _platform: Platform;
    private _intelliCode?: IntelliCodeExtension;
    // TODO: the following settings are cached in getSettings() while they may be
    // set per workspace or folder. Figure out how can we maintain cache per resource.
    private _progressBarEnabled?: boolean;
    private _hasSemanticTokensRefreshCapability?: boolean;

    private _hasExperimentationSupport?: boolean;
    private _inExperimentCache: Map<string, boolean>;
    private _getExperimentValueCache: Map<string, any>;

    private _hasTrustedWorkspaceSupport?: boolean;
    private _hostKind: HostKind = HostKind.LimitedAccess;

    constructor(
        serverOptions: ServerOptions,
        connection: Connection,
        console: ConsoleInterface,
        private _defaultSettings: PylanceServerSettings,
        private _backgroundThreadFactory: BackgroundAnalysisFactory,
        private _hostFactory: (kind: HostKind, fs: FileSystem) => Host,
        private _hasVSCodeExtension: boolean
    ) {
        super(serverOptions, connection, console);

        // root directory will be used for 2 different purpose.
        // 1. to find "typeshed-fallback" folder.
        // 2. to set "cwd" to run python to find search path.
        debug.assert(
            this.fs.existsSync(path.join(serverOptions.rootDirectory, consts.typeshedFallback)),
            `Unable to locate typeshed fallback folder at '${serverOptions.rootDirectory}'`
        );

        this._analysisTracker = new AnalysisTracker();
        this._telemetry = new TelemetryService(this._connection as any);
        this._controller = new CommandController(this, this._telemetry, this._hasVSCodeExtension);
        this._completionCoverage = new CompletionCoverage.CompletionTelemetry(this._telemetry);
        this._logger = new LogService(this.console as ConsoleWithLogLevel);
        this._platform = new Platform();

        // IntelliCode may be enabled or disabled depending on user settings.
        // We don't know the state here since settings haven't been accessed yet.
        this._intelliCode = serverOptions.extension as IntelliCodeExtension;

        // Initialize IntelliCode. This does not start it since it needs path
        // to the model which will come later from the IntelliCode extension.
        this._intelliCode?.initialize(this._logger, this._telemetry, this._platform);

        this._inExperimentCache = new Map();
        this._getExperimentValueCache = new Map();
    }

    async getSettings(workspace: WorkspaceServiceInstance): Promise<ServerSettings> {
        // Clone default settings to local server settings. It is safe to clone settings
        // using JSON since it is a pure record type (no circular reference nor function)
        const serverSettings: PylanceServerSettings = JSON.parse(JSON.stringify(this._defaultSettings));

        if (IS_INSIDERS) {
            serverSettings.indexing = true;
        } else if (IS_DEV || IS_PR) {
            serverSettings.indexing = true;
        } else {
            const indexingExperiment = await this._inExperiment('pylanceIndexingEnabled');
            serverSettings.indexing = indexingExperiment ?? false;
        }

        this._hostKind = await this._getHostKind();

        let forceProgressBar = false;

        try {
            const pythonSection = await this.getConfiguration(workspace.rootUri, pythonSectionName);
            if (pythonSection) {
                const pythonPath = pythonSection.pythonPath;
                if (pythonPath && isString(pythonPath) && !isPythonBinary(pythonPath)) {
                    serverSettings.pythonPath = resolvePaths(
                        workspace.rootPath,
                        this.expandPathVariables(workspace.rootPath, pythonPath)
                    );
                }

                const venvPath = pythonSection.venvPath;
                if (venvPath && isString(venvPath)) {
                    serverSettings.venvPath = resolvePaths(
                        workspace.rootPath,
                        this.expandPathVariables(workspace.rootPath, venvPath)
                    );
                }

                const envPYTHONPATH = pythonSection._envPYTHONPATH;
                if (envPYTHONPATH && isString(envPYTHONPATH)) {
                    serverSettings.extraPaths = envPYTHONPATH
                        .split(path.delimiter)
                        .filter((p) => p)
                        .map((p) => resolvePaths(workspace.rootPath, p));
                }
            }

            const pythonAnalysisSection = await this.getConfiguration(workspace.rootUri, pythonAnalysisSectionName);
            if (pythonAnalysisSection) {
                const typeshedPaths = pythonAnalysisSection.typeshedPaths;
                if (typeshedPaths && Array.isArray(typeshedPaths) && typeshedPaths.length > 0) {
                    const typeshedPath = typeshedPaths[0];
                    if (typeshedPath && isString(typeshedPath)) {
                        serverSettings.typeshedPath = resolvePaths(
                            workspace.rootPath,
                            this.expandPathVariables(workspace.rootPath, typeshedPath)
                        );
                    }
                }

                const stubPath = pythonAnalysisSection.stubPath;
                if (stubPath && isString(stubPath)) {
                    serverSettings.stubPath = resolvePaths(
                        workspace.rootPath,
                        this.expandPathVariables(workspace.rootPath, stubPath)
                    );
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

                if (isBoolean(pythonAnalysisSection.useLibraryCodeForTypes)) {
                    serverSettings.useLibraryCodeForTypes = pythonAnalysisSection.useLibraryCodeForTypes;
                }

                if (isBoolean(pythonAnalysisSection.autoSearchPaths)) {
                    serverSettings.autoSearchPaths = pythonAnalysisSection.autoSearchPaths;
                }

                if (['off', 'basic', 'strict'].includes(pythonAnalysisSection.typeCheckingMode)) {
                    serverSettings.typeCheckingMode = pythonAnalysisSection.typeCheckingMode;
                }

                const extraPaths = pythonAnalysisSection.extraPaths;
                if (extraPaths && Array.isArray(extraPaths) && extraPaths.length > 0) {
                    const paths = extraPaths
                        .filter((p) => p && isString(p))
                        .map((p) => resolvePaths(workspace.rootPath, this.expandPathVariables(workspace.rootPath, p)));

                    if (serverSettings.extraPaths) {
                        // extraPaths before PYTHONPATH, like MPLS.
                        serverSettings.extraPaths = paths.concat(serverSettings.extraPaths);
                    } else {
                        serverSettings.extraPaths = paths;
                    }
                }

                if (isBoolean(pythonAnalysisSection.autoImportCompletions)) {
                    serverSettings.autoImportCompletions = pythonAnalysisSection.autoImportCompletions;
                }

                if (isBoolean(pythonAnalysisSection.completeFunctionParens)) {
                    serverSettings.completeFunctionParens = pythonAnalysisSection.completeFunctionParens;
                }

                if (isBoolean(pythonAnalysisSection.indexing)) {
                    serverSettings.indexing = pythonAnalysisSection.indexing;
                }

                if (
                    serverSettings.logLevel === LogLevel.Log &&
                    isBoolean(pythonAnalysisSection.logTypeEvaluationTime)
                ) {
                    serverSettings.logTypeEvaluationTime = pythonAnalysisSection.logTypeEvaluationTime;
                }

                if (isNumber(pythonAnalysisSection.typeEvaluationTimeThreshold)) {
                    serverSettings.typeEvaluationTimeThreshold = pythonAnalysisSection.typeEvaluationTimeThreshold;
                }

                if (isBoolean(pythonAnalysisSection.enableExtractCodeAction)) {
                    serverSettings.enableExtractCodeAction = pythonAnalysisSection.enableExtractCodeAction;
                }

                if (!workspace.rootPath) {
                    // indexing is off by default
                    // for the default workspace.
                    serverSettings.indexing = false;
                }

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

        const te = new TelemetryEvent(TelemetryEventName.SETTINGS);
        te.Properties['openFilesOnly'] = `${serverSettings.openFilesOnly}`;
        te.Properties['typeCheckingMode'] = `${serverSettings.typeCheckingMode}`;
        te.Properties['useLibraryCodeForTypes'] = `${serverSettings.useLibraryCodeForTypes}`;
        te.Properties['autoSearchPaths'] = `${serverSettings.autoSearchPaths}`;
        te.Properties['autoImportCompletions'] = `${serverSettings.autoImportCompletions}`;
        te.Properties['indexing'] = `${serverSettings.indexing}`;
        te.Properties['completeFunctionParens'] = `${serverSettings.completeFunctionParens}`;
        te.Properties['enableExtractCodeAction'] = `${serverSettings.enableExtractCodeAction}`;
        te.Properties['hasExtraPaths'] = `${!!serverSettings.extraPaths?.length}`;
        te.Measurements['workspaceCount'] = this._workspaceMap.getNonDefaultWorkspaces().length;
        this._telemetry.sendTelemetry(te);

        return serverSettings;
    }

    createBackgroundAnalysis(): BackgroundAnalysisBase | undefined {
        if (!getCancellationFolderName()) {
            // old client. it doesn't support cancellation.
            return undefined;
        }

        return this._backgroundThreadFactory(this._telemetry, this.console);
    }

    override updateSettingsForAllWorkspaces(): void {
        this._updateGlobalSettings().ignoreErrors();
        super.updateSettingsForAllWorkspaces();
        if (this._hasSemanticTokensRefreshCapability) {
            this._connection.sendRequest(SemanticTokensRefreshRequest.method).ignoreErrors();
        }
    }

    protected override initialize(
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

        this._hasExperimentationSupport = params.initializationOptions?.experimentationSupport;
        this._hasTrustedWorkspaceSupport = params.initializationOptions?.trustedWorkspaceSupport;

        return result;
    }

    protected override setupConnection(supportedCommands: string[], supportedCodeActions: string[]): void {
        super.setupConnection(supportedCommands, supportedCodeActions);

        this._connection.languages.semanticTokens.on(
            async (params: SemanticTokensParams, token: CancellationToken): Promise<SemanticTokens> => {
                const filePath = convertUriToPath(this.fs, params.textDocument.uri);

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
                const filePath = convertUriToPath(this.fs, params.textDocument.uri);

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
                const filePath = convertUriToPath(this.fs, params.textDocument.uri);

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

        this._connection.onNotification(CustomLSP.Notifications.WorkspaceTrusted, async (params) => {
            this._hostKind = params.isTrusted ? HostKind.FullAccess : HostKind.LimitedAccess;
            this.restart();
        });
    }

    protected override createHost() {
        return this._hostFactory(this._hostKind, this.fs);
    }

    protected override createBackgroundAnalysisProgram(
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
            maxAnalysisTime,
            this._serverOptions.disableChecker
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
        if (this._intelliCode && params.command.startsWith(this._intelliCode.completionListExtension.commandPrefix)) {
            return this._intelliCode.completionListExtension.executeCommand(params.command, params.arguments, token);
        }
        return this._controller.execute(params, token);
    }

    protected override createImportResolver(fs: FileSystem, options: ConfigOptions, host: Host): ImportResolver {
        return createPylanceImportResolver(fs, options, host);
    }

    protected async executeCodeAction(
        params: CodeActionParams,
        token: CancellationToken
    ): Promise<(Command | CodeAction)[] | undefined | null> {
        this.recordUserInteractionTime();

        const filePath = convertUriToPath(this.fs, params.textDocument.uri);
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
            this._hasVSCodeExtension,
            token
        );

        return [...actions1, ...actions2];
    }

    protected override resolveWorkspaceCompletionItem(
        workspace: WorkspaceServiceInstance,
        filePath: string,
        item: CompletionItem,
        token: CancellationToken
    ): void {
        workspace.serviceInstance.resolveCompletionItem(
            filePath,
            item,
            this.getCompletionOptions(),
            wellKnownAbbreviationMap,
            token
        );
    }

    protected override async getWorkspaceCompletionsForPosition(
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
                    this.getCompletionOptions(),
                    wellKnownAbbreviationMap,
                    token
                );

                cm.addCustomMeasure('completionItems', completionResults?.completionList?.items.length ?? -1);

                if (completionResults?.autoImportInfo) {
                    const min = 1;
                    cm.addCustomMeasure(
                        'autoImportAdditionTimeInMS',
                        completionResults.autoImportInfo.additionTimeInMS
                    );
                    cm.addCustomMeasure('autoImportIndexUsed', completionResults.autoImportInfo.indexUsed ? 1 : 0);
                    cm.addCustomMeasure('autoImportTotalTimeInMS', completionResults.autoImportInfo.totalTimeInMS);

                    cm.addCustomMeasure('autoImportItemCount', completionResults.autoImportInfo.itemCount, min);
                    cm.addCustomMeasure('autoImportSymbolCount', completionResults.autoImportInfo.symbolCount, min);
                    cm.addCustomMeasure('autoImportIndexCount', completionResults.autoImportInfo.indexCount, min);
                    cm.addCustomMeasure(
                        'autoImportImportAliasCount',
                        completionResults.autoImportInfo.importAliasCount,
                        min
                    );

                    cm.addCustomMeasure('autoImportModuleTimeInMS', completionResults.autoImportInfo.moduleTimeInMS);
                    cm.addCustomMeasure('autoImportIndexTimeInMS', completionResults.autoImportInfo.indexTimeInMS);
                    cm.addCustomMeasure(
                        'autoImportImportAliasTimeInMS',
                        completionResults.autoImportInfo.importAliasTimeInMS
                    );
                }

                if (completionResults?.extensionInfo) {
                    cm.setCorrelationId(completionResults.extensionInfo.correlationId);
                    cm.addCustomMeasure(
                        'selectedItemTelemetryBuildTimeInMs',
                        completionResults.extensionInfo.selectedItemTelemetryTimeInMS
                    );
                    cm.addCustomMeasure(
                        'completionItemTelemetryBuildTimeInMs',
                        completionResults.extensionInfo.itemTelemetryTimeInMS
                    );
                    cm.addCustomMeasure('extensionTotalTimeInMS', completionResults.extensionInfo.totalTimeInMS);
                }

                if (completionResults?.completionList) {
                    for (const item of completionResults.completionList.items) {
                        const command =
                            item.detail === autoImportDetail
                                ? autoImportAcceptedCommand
                                : item.detail === dictionaryKeyDetail
                                ? dictKeyAcceptedCommand
                                : normalCompletionAcceptedCommand;
                        item.command = mergeCommands(item.command, command);
                    }
                }

                return completionResults;
            },
            1000
        );

        StubTelemetry.sendStubCompletionTelemetryForMissingTypes(results, this._telemetry);
        this._completionCoverage.update(results);

        return results;
    }

    protected override onAnalysisCompletedHandler(results: AnalysisResults): void {
        super.onAnalysisCompletedHandler(results);

        if (results.error) {
            sendExceptionTelemetry(this._telemetry, TelemetryEventName.ANALYSIS_EXCEPTION, results.error);
        }

        if (results.diagnostics.length === 0 && results.filesRequiringAnalysis > 0 && results.elapsedTime === 0) {
            // This is not from actual analysis
            return;
        }

        this.sendTelemetry(results);
    }

    protected override async onCompletion(
        params: CompletionParams,
        token: CancellationToken
    ): Promise<CompletionList | undefined> {
        const completionList = await super.onCompletion(params, token);
        const workspace = (await this.getWorkspaceForFile(
            convertUriToPath(this.fs, params.textDocument.uri)
        )) as PylanceWorkspaceServiceInstance;

        if (completionList && this.client.hasVisualStudioExtensionsCapability) {
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
                updateInsertTextForAutoParensIfNeeded(c, params.textDocument.uri, this._hasVSCodeExtension);
            }
        }
        return completionList;
    }

    protected override createWorkspaceServiceInstance(
        workspace: WorkspaceFolder | undefined,
        rootPath: string
    ): PylanceWorkspaceServiceInstance {
        const src = super.createWorkspaceServiceInstance(workspace, rootPath);
        return { ...src, completeFunctionParens: false, enableExtractCodeAction: false };
    }

    override async updateSettingsForWorkspace(
        workspace: WorkspaceServiceInstance,
        serverSettings?: ServerSettings
    ): Promise<void> {
        serverSettings = serverSettings ?? (await this.getSettings(workspace));
        await super.updateSettingsForWorkspace(workspace, serverSettings);

        const pylanceSettings = serverSettings as PylanceServerSettings;
        const pylanceWorkspace = workspace as PylanceWorkspaceServiceInstance;

        pylanceWorkspace.completeFunctionParens = !!pylanceSettings.completeFunctionParens;
        pylanceWorkspace.enableExtractCodeAction = !!pylanceSettings.enableExtractCodeAction;

        this._getBackgroundAnalysisProgram(workspace).setExperimentOptions({});

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
        this._intelliCode?.updateSettings(pythonAnalysis?.intelliCodeEnabled ?? true);
    }

    private sendTelemetry(results: AnalysisResults): void {
        const te = this._analysisTracker.updateTelemetry(results);
        if (!te) {
            return;
        }
        this._telemetry.sendTelemetry(te);
    }

    private async _inExperiment(experimentName: string): Promise<boolean | undefined> {
        if (!this._hasExperimentationSupport) {
            return undefined;
        }

        const cached = this._inExperimentCache.get(experimentName);
        if (cached !== undefined) {
            return cached;
        }

        const { inExperiment } = await CustomLSP.sendRequest(this._connection, CustomLSP.Requests.InExperiment, {
            experimentName,
        });
        this._inExperimentCache.set(experimentName, inExperiment);
        return inExperiment;
    }

    private async _getHostKind(): Promise<HostKind> {
        if (!this._hasTrustedWorkspaceSupport) {
            // if TrustedWorkspace is not supported, for backward compatibility, we assume HostKind.FullAccess workspace.
            return HostKind.FullAccess;
        }

        const { isTrusted } = await CustomLSP.sendRequest(
            this._connection,
            CustomLSP.Requests.IsTrustedWorkspace,
            undefined
        );

        return isTrusted ? HostKind.FullAccess : HostKind.LimitedAccess;
    }

    private async _getExperimentValue<T extends boolean | number | string>(
        experimentName: string
    ): Promise<T | undefined> {
        if (!this._hasExperimentationSupport) {
            return undefined;
        }

        const cached = this._getExperimentValueCache.get(experimentName);
        if (cached !== undefined) {
            return cached;
        }

        const { value } = await CustomLSP.sendRequest(this._connection, CustomLSP.Requests.GetExperimentValue, {
            experimentName,
        });
        this._getExperimentValueCache.set(experimentName, value);
        return value;
    }

    protected createProgressReporter(): ProgressReporter {
        return {
            isEnabled: (data: AnalysisResults) => !!this._progressBarEnabled,
            begin: () => {
                CustomLSP.sendNotification(this._connection, CustomLSP.Notifications.BeginProgress, undefined);
            },
            report: (message: string) => {
                CustomLSP.sendNotification(this._connection, CustomLSP.Notifications.ReportProgress, message);
            },
            end: () => {
                CustomLSP.sendNotification(this._connection, CustomLSP.Notifications.EndProgress, undefined);
            },
        };
    }

    protected override getDocumentationUrlForDiagnosticRule(rule: string): string | undefined {
        return 'https://github.com/microsoft/pylance-release/blob/main/DIAGNOSTIC_SEVERITY_RULES.md#diagnostic-severity-rules';
    }
}

class PylanceBackgroundAnalysisProgram extends BackgroundAnalysisProgram {
    constructor(
        console: ConsoleInterface,
        configOptions: ConfigOptions,
        importResolver: ImportResolver,
        extension?: LanguageServiceExtension,
        backgroundAnalysis?: BackgroundAnalysisBase,
        maxAnalysisTime?: MaxAnalysisTime,
        disableChecker?: boolean
    ) {
        super(console, configOptions, importResolver, extension, backgroundAnalysis, maxAnalysisTime, disableChecker);
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

    async setExperimentOptions(options: ExperimentOptions) {
        if (this.backgroundAnalysis) {
            (this.backgroundAnalysis as BackgroundAnalysis).setExperimentOptions(options);
        }

        // Set experiment options on FG if there is any
    }
}

export function updateInsertTextForAutoParensIfNeeded(
    item: CompletionItem,
    textDocumentUri: string,
    hasVSCodeExtension: boolean
) {
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

        if (hasVSCodeExtension) {
            item.command = mergeCommands(item.command, {
                title: '',
                command: ClientCommands.triggerParameterHints,
                arguments: [textDocumentUri],
            });
        }
    }
}
