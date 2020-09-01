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
    CompletionItemKind,
    CompletionList,
    CompletionParams,
    ExecuteCommandParams,
    InitializeParams,
    InitializeResult,
    InsertTextFormat,
    WorkspaceFolder,
} from 'vscode-languageserver/node';
import { isMainThread } from 'worker_threads';

import { AnalysisResults } from 'pyright-internal/analyzer/analysis';
import { ImportResolver } from 'pyright-internal/analyzer/importResolver';
import { BackgroundAnalysisBase } from 'pyright-internal/backgroundAnalysisBase';
import { Commands as PyRightCommands } from 'pyright-internal/commands/commands';
import { getCancellationFolderName } from 'pyright-internal/common/cancellationUtils';
import { ConfigOptions } from 'pyright-internal/common/configOptions';
import { ConsoleWithLogLevel, LogLevel } from 'pyright-internal/common/console';
import { isString } from 'pyright-internal/common/core';
import * as debug from 'pyright-internal/common/debug';
import { createFromRealFileSystem, FileSystem } from 'pyright-internal/common/fileSystem';
import * as consts from 'pyright-internal/common/pathConsts';
import { convertUriToPath, normalizeSlashes } from 'pyright-internal/common/pathUtils';
import { ProgressReporter } from 'pyright-internal/common/progressReporter';
import {
    LanguageServerBase,
    ProgressReporterConnection,
    ServerSettings,
    WorkspaceServiceInstance,
} from 'pyright-internal/languageServerBase';
import { CodeActionProvider as PyrightCodeActionProvider } from 'pyright-internal/languageService/codeActionProvider';

import { BackgroundAnalysis, runBackgroundThread } from './backgroundAnalysis';
import { CommandController } from './commands/commandController';
import { Commands } from './commands/commands';
import { PYRIGHT_COMMIT, VERSION } from './common/constants';
import { LogService } from './common/logger';
import { Platform } from './common/platform';
import {
    addMeasurementsToEvent,
    sendMeasurementsTelemetry,
    TelemetryEvent,
    TelemetryEventName,
    TelemetryService,
} from './common/telemetry';
import { IntelliCodeExtension } from './intelliCode/extension';
import { ModelSubFolder } from './intelliCode/models';
import { prepareNativesForCurrentPlatform } from './intelliCode/nativeInit';
import { CodeActionProvider as PylanceCodeActionProvider } from './languageService/codeActionProvider';
import { createPylanceImportResolver, PylanceImportResolver } from './pylanceImportResolver';
import { AnalysisTracker } from './services/analysisTracker';

const pythonSectionName = 'python';
const pythonAnalysisSectionName = 'python.analysis';

export interface PylanceServerSettings extends ServerSettings {
    completeFunctionParens?: boolean;
}
export interface PylanceWorkspaceServiceInstance extends WorkspaceServiceInstance {
    completeFunctionParens?: boolean;
}

class PylanceServer extends LanguageServerBase {
    private _controller: CommandController;
    private _analysisTracker: AnalysisTracker;
    private _telemetry: TelemetryService;
    private _logger: LogService;
    private _platform: Platform;
    private _intelliCode: IntelliCodeExtension;
    // TODO: the following settings are cached in getSettings() while they may be
    // set per workspace or folder. Figure out how can we maintain cache per resource.
    private _progressBarEnabled?: boolean;

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
            supportedCodeActions: [CodeActionKind.QuickFix],
        });

        // root directory will be used for 2 different purpose.
        // 1. to find "typeshed-fallback" folder.
        // 2. to set "cwd" to run python to find search path.
        debug.assert(
            this.fs.existsSync(path.join(rootDirectory, consts.typeshedFallback)),
            `Unable to locate typeshed fallback folder at '${rootDirectory}'`
        );
        this._controller = new CommandController(this);
        this._analysisTracker = new AnalysisTracker();
        this._telemetry = new TelemetryService(this._connection as any);
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
            completeFunctionParens: false,
        };

        try {
            const pythonSection = await this.getConfiguration(workspace.rootUri, pythonSectionName);
            if (pythonSection) {
                serverSettings.pythonPath = normalizeSlashes(pythonSection.pythonPath);
                serverSettings.venvPath = normalizeSlashes(pythonSection.venvPath);
            }

            const pythonAnalysisSection = await this.getConfiguration(workspace.rootUri, pythonAnalysisSectionName);
            if (pythonAnalysisSection) {
                const typeshedPaths = pythonAnalysisSection.typeshedPaths;
                if (typeshedPaths && Array.isArray(typeshedPaths) && typeshedPaths.length > 0) {
                    serverSettings.typeshedPath = normalizeSlashes(typeshedPaths[0]);
                }

                const stubPath = pythonAnalysisSection.stubPath;
                if (stubPath && isString(stubPath)) {
                    serverSettings.stubPath = normalizeSlashes(stubPath);
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
                    serverSettings.extraPaths = extraPaths.map((p) => normalizeSlashes(p));
                }

                serverSettings.autoImportCompletions =
                    pythonAnalysisSection.autoImportCompletions ?? serverSettings.autoImportCompletions;
                serverSettings.completeFunctionParens =
                    pythonAnalysisSection.completeFunctionParens ?? serverSettings.completeFunctionParens;
            }
        } catch (error) {
            this.console.error(`Error reading settings: ${error}`);
        }

        // If typeCheckingMode is not 'off' or if there is any custom rule enabled, then progress bar is enabled.
        this._progressBarEnabled =
            serverSettings.typeCheckingMode !== 'off' ||
            Object.values(serverSettings.diagnosticSeverityOverrides!).some((v) => v !== 'none');

        return serverSettings;
    }

    createBackgroundAnalysis(): BackgroundAnalysisBase | undefined {
        if (!getCancellationFolderName()) {
            // old client. it doesn't support cancellation.
            return undefined;
        }

        return new BackgroundAnalysis(this.console);
    }

    updateSettingsForAllWorkspaces(): void {
        this._updateGlobalSettings().ignoreErrors();
        super.updateSettingsForAllWorkspaces();
    }

    protected initialize(
        params: InitializeParams,
        supportedCommands: string[],
        supportedCodeActions: string[]
    ): InitializeResult {
        const result = super.initialize(params, supportedCommands, supportedCodeActions);

        // Temporary workaround until VS internal issue 1155697 is fixed
        // VS protocol type definitions are not up to date with current LSP spec
        // and only expects booleans for these.
        // TODO: remove this when the above issue is fixed
        if (this._hasVisualStudioExtensionsCapability) {
            result.capabilities.definitionProvider = true;
            result.capabilities.referencesProvider = true;
            result.capabilities.documentSymbolProvider = true;
            result.capabilities.workspaceSymbolProvider = true;
            result.capabilities.documentHighlightProvider = true;
        }

        return result;
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
                sendMeasurementsTelemetry(this._telemetry, TelemetryEventName.IMPORT_METRICS, importMetrics);
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
        const workspace = await this.getWorkspaceForFile(filePath);
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

    protected onAnalysisCompletedHandler(results: AnalysisResults): void {
        super.onAnalysisCompletedHandler(results);

        if (results.diagnostics.length === 0 && results.filesRequiringAnalysis > 0 && results.elapsedTime === 0) {
            // This is not from actual analysis
            return;
        }

        const te = this._analysisTracker.updateTelemetry(results);
        if (te) {
            this._connection.telemetry.logEvent(te);

            //send import metrics
            let shouldSend = false;
            const importEvent = new TelemetryEvent(TelemetryEventName.IMPORT_METRICS);
            this._workspaceMap.forEach((workspace) => {
                const resolver = workspace.serviceInstance.getImportResolver();
                if (resolver instanceof PylanceImportResolver) {
                    const importMetrics = resolver.getAndResetImportMetrics();
                    if (!importMetrics.isEmpty()) {
                        addMeasurementsToEvent(importEvent, importMetrics);
                        shouldSend = true;
                    }
                }
            });

            if (shouldSend) {
                this._telemetry.sendTelemetry(importEvent);
            }
        }
    }

    protected async onCompletion(
        params: CompletionParams,
        token: CancellationToken
    ): Promise<CompletionList | undefined> {
        const completionList = await super.onCompletion(params, token);
        const workspace = (await this.getWorkspaceForFile(
            convertUriToPath(params.textDocument.uri)
        )) as PylanceWorkspaceServiceInstance;

        if (completionList && workspace.completeFunctionParens && !token.isCancellationRequested) {
            for (const c of completionList.items) {
                if (c.kind === CompletionItemKind.Function || c.kind === CompletionItemKind.Method) {
                    c.insertText = (c.insertText ?? c.label) + '($0)';
                    c.insertTextFormat = InsertTextFormat.Snippet;
                }
            }
        }
        return completionList;
    }

    protected createWorkspaceServiceInstance(
        workspace: WorkspaceFolder | undefined,
        rootPath: string
    ): PylanceWorkspaceServiceInstance {
        const src = super.createWorkspaceServiceInstance(workspace, rootPath);
        return { ...src, completeFunctionParens: false };
    }

    async updateSettingsForWorkspace(
        workspace: WorkspaceServiceInstance,
        serverSettings?: ServerSettings
    ): Promise<void> {
        serverSettings = serverSettings ?? (await this.getSettings(workspace));
        await super.updateSettingsForWorkspace(workspace, serverSettings);
        (workspace as PylanceWorkspaceServiceInstance).completeFunctionParens = !!(serverSettings as PylanceServerSettings)
            .completeFunctionParens;

        if (workspace.disableLanguageServices) {
            return;
        }
        workspace.serviceInstance.startIndexing();
    }

    private async _updateGlobalSettings(): Promise<void> {
        const pythonAnalysis = await this.getConfiguration(undefined, pythonAnalysisSectionName);
        this._intelliCode.updateSettings(pythonAnalysis?.intelliCodeEnabled ?? true);
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
