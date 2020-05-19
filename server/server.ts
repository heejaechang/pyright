/*
 * server.ts
 *
 * Implements PyRx language server.
 */

import * as path from 'path';
import { isArray } from 'util';
import {
    CancellationToken,
    CodeAction,
    CodeActionParams,
    Command,
    ConfigurationItem,
    ExecuteCommandParams,
    RemoteConsole,
} from 'vscode-languageserver';
import { isMainThread } from 'worker_threads';

import { BackgroundAnalysis } from './backgroundAnalysis';
import { IntelliCodeExtension } from './intelliCode/extension';
import { ModelZipAcquisionServiceImpl } from './intelliCode/modelAcquisitionService';
import { ModelSubFolder } from './intelliCode/models';
import { prepareNativesForCurrentPlatform } from './intelliCode/nativeInit';
import { AnalysisResults } from './pyright/server/src/analyzer/analysis';
import { ImportResolver } from './pyright/server/src/analyzer/importResolver';
import { BackgroundAnalysisBase } from './pyright/server/src/backgroundAnalysisBase';
import { getCancellationFolderName } from './pyright/server/src/common/cancellationUtils';
import { ConfigOptions } from './pyright/server/src/common/configOptions';
import { isString } from './pyright/server/src/common/core';
import * as debug from './pyright/server/src/common/debug';
import { createFromRealFileSystem, FileSystem } from './pyright/server/src/common/fileSystem';
import * as consts from './pyright/server/src/common/pathConsts';
import { convertUriToPath, normalizeSlashes } from './pyright/server/src/common/pathUtils';
import { LanguageServerBase, ServerSettings, WorkspaceServiceInstance } from './pyright/server/src/languageServerBase';
import { CodeActionProvider as PyrightCodeActionProvider } from './pyright/server/src/languageService/codeActionProvider';
import { createPyrxImportResolver, PyrxImportResolver } from './pyrxImportResolver';
import { CommandController } from './src/commands/commandController';
import { LogLevel, LogService } from './src/common/logger';
import { Platform } from './src/common/platform';
import {
    addMeasurementsToEvent,
    sendMeasurementsTelemetry,
    TelemetryEvent,
    TelemetryEventName,
    TelemetryService,
} from './src/common/telemetry';
import { CodeActionProvider as PyrxCodeActionProvider } from './src/languageService/codeActionProvider';
import { AnalysisTracker } from './src/services/analysisTracker';

const pythonSectionName = 'python';
const pythonAnalysisSectionName = 'python.analysis';

class PyRxServer extends LanguageServerBase {
    private _controller: CommandController;
    private _analysisTracker: AnalysisTracker;
    private _telemetry: TelemetryService;
    private _logger: LogService;
    private _platform: Platform;
    private _intelliCode: IntelliCodeExtension;

    constructor() {
        const rootDirectory = __dirname;
        const intelliCode = new IntelliCodeExtension();
        super('Python', rootDirectory, intelliCode, undefined, CommandController.supportedCommands());

        // pyrx has "typeshed-fallback" under "client/server" rather than "client" as pyright does
        // but __dirname points to "client/server" same as pyright.
        // the difference comes from the fact that pyright deploy everything under client but pyrx
        // let users to download only server part.
        //
        // make sure root directory points to __dirname which is "client/server" where we can discover
        // "typeshed-fallback" folder
        //
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
        this._logger = new LogService((this._connection.console as any) as RemoteConsole);
        this._platform = new Platform();

        // IntelliCode may be enabled or disabled depending on user settings.
        // We don't know the state here since settings haven't been accessed yet.
        this._intelliCode = intelliCode;
        const icModelSubfolder = path.join(this.fs.getModulePath(), ModelSubFolder);
        intelliCode.initialize(
            this._logger,
            this._telemetry,
            this.fs,
            this._platform,
            new ModelZipAcquisionServiceImpl(this.fs),
            icModelSubfolder
        );
    }

    async getSettings(workspace: WorkspaceServiceInstance): Promise<ServerSettings> {
        const serverSettings: ServerSettings = {
            autoSearchPaths: true,
            disableLanguageServices: false,
            openFilesOnly: true,
            useLibraryCodeForTypes: true,
            watchForSourceChanges: true,
            watchForLibraryChanges: true,
            typeCheckingMode: 'off',
            diagnosticSeverityOverrides: {},
        };

        try {
            const pythonSection = await this.getConfiguration(workspace, pythonSectionName);
            if (pythonSection) {
                serverSettings.pythonPath = normalizeSlashes(pythonSection.pythonPath);
                serverSettings.venvPath = normalizeSlashes(pythonSection.venvPath);
            }

            const pythonAnalysisSection = await this.getConfiguration(workspace, pythonAnalysisSectionName);
            if (pythonAnalysisSection) {
                const typeshedPaths = pythonAnalysisSection.typeshedPaths;
                if (typeshedPaths && isArray(typeshedPaths) && typeshedPaths.length > 0) {
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

                serverSettings.openFilesOnly = this.isOpenFilesOnly(pythonAnalysisSection.diagnosticMode);
                serverSettings.useLibraryCodeForTypes =
                    pythonAnalysisSection.useLibraryCodeForTypes ?? serverSettings.useLibraryCodeForTypes;
                serverSettings.autoSearchPaths =
                    pythonAnalysisSection.autoSearchPaths ?? serverSettings.autoSearchPaths;
                serverSettings.typeCheckingMode =
                    pythonAnalysisSection.typeCheckingMode ?? serverSettings.typeCheckingMode;

                const extraPaths = pythonAnalysisSection.extraPaths;
                if (extraPaths && isArray(extraPaths) && extraPaths.length > 0) {
                    serverSettings.extraPaths = extraPaths.map((p) => normalizeSlashes(p));
                }
            }
        } catch (error) {
            this.console.log(`Error reading settings: ${error}`);
        }
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

    protected executeCommand(params: ExecuteCommandParams, token: CancellationToken): Promise<any> {
        return this._controller.execute(params, token);
    }

    protected createImportResolver(fs: FileSystem, options: ConfigOptions): ImportResolver {
        const resolver = createPyrxImportResolver(fs, options);

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

        const actions2 = await PyrxCodeActionProvider.getCodeActionsForPosition(
            workspace,
            filePath,
            params.range,
            token
        );

        return [...actions1, ...actions2];
    }

    protected onAnalysisCompletedHandler(results: AnalysisResults): void {
        super.onAnalysisCompletedHandler(results);

        const te = this._analysisTracker.updateTelemetry(results);
        if (te) {
            this._connection.telemetry.logEvent(te);

            //send import metrics
            let shouldSend = false;
            const importEvent = new TelemetryEvent(TelemetryEventName.IMPORT_METRICS);
            this._workspaceMap.forEach((workspace) => {
                const resolver = workspace.serviceInstance.getImportResolver();
                if (resolver instanceof PyrxImportResolver) {
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

    private async _updateGlobalSettings(): Promise<void> {
        const item: ConfigurationItem = {
            scopeUri: undefined,
            section: pythonAnalysisSectionName,
        };
        const pythonAnalysis = await this._connection.workspace.getConfiguration(item);
        this._logger.level = pythonAnalysis?.logLevel ?? LogLevel.Info;
        this._intelliCode.updateSettings(pythonAnalysis?.intelliCodeEnabled ?? true);
    }
}

if (isMainThread) {
    prepareNativesForCurrentPlatform(createFromRealFileSystem(), new Platform());
    new PyRxServer();
}
