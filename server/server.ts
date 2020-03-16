/*
 * server.ts
 *
 * Implements PyRx language server.
 */

import * as path from 'path';
import { isArray } from 'util';
import { CodeAction, CodeActionParams, Command, ExecuteCommandParams, CancellationToken } from 'vscode-languageserver';
import { CommandController } from './commands/commandController';
import { ImportResolver } from './pyright/server/src/analyzer/importResolver';
import { AnalysisResults } from './pyright/server/src/analyzer/service';
import { ConfigOptions } from './pyright/server/src/common/configOptions';
import * as debug from './pyright/server/src/common/debug';
import * as consts from './pyright/server/src/common/pathConsts';
import { convertUriToPath, normalizeSlashes } from './pyright/server/src/common/pathUtils';
import { VirtualFileSystem } from './pyright/server/src/common/vfs';
import { LanguageServerBase, ServerSettings, WorkspaceServiceInstance } from './pyright/server/src/languageServerBase';
import { CodeActionProvider } from './pyright/server/src/languageService/codeActionProvider';
import { createPyrxImportResolver, PyrxImportResolver } from './pyrxImportResolver';
import { AnalysisTracker } from './src/telemetry/analysisTracker';
import { createTelemetryEvent } from './src/telemetry/telemetryEvent';
import { EventName, addNumericsToTelemetry } from './src/telemetry/telemetryProtocol';

class Server extends LanguageServerBase {
    private _controller: CommandController;
    private _analysisTracker: AnalysisTracker;

    constructor() {
        const rootDirectory = __dirname;
        super('Python', rootDirectory);

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
    }

    async getSettings(workspace: WorkspaceServiceInstance): Promise<ServerSettings> {
        const serverSettings: ServerSettings = {
            disableLanguageServices: false
        };

        try {
            const pythonSection = await this.getConfiguration(workspace, 'python');
            if (pythonSection) {
                serverSettings.pythonPath = normalizeSlashes(pythonSection.pythonPath);
                serverSettings.venvPath = normalizeSlashes(pythonSection.venvPath);
            }

            const pythonAnalysisSection = await this.getConfiguration(workspace, 'python.analysis');
            if (pythonAnalysisSection) {
                const typeshedPaths = pythonAnalysisSection.typeshedPaths;
                if (typeshedPaths && isArray(typeshedPaths) && typeshedPaths.length > 0) {
                    serverSettings.typeshedPath = normalizeSlashes(typeshedPaths[0]);
                }

                // default openFilesOnly and useLibraryCodeForTypes to "true" unless users have set it explicitly
                serverSettings.openFilesOnly = pythonAnalysisSection.openFilesOnly ?? true;
                serverSettings.useLibraryCodeForTypes = pythonAnalysisSection.useLibraryCodeForTypes ?? true;
                serverSettings.autoSearchPaths = pythonAnalysisSection.autoSearchPaths ?? true;
            } else {
                serverSettings.openFilesOnly = true;
                serverSettings.useLibraryCodeForTypes = true;
                serverSettings.autoSearchPaths = true;
            }
        } catch (error) {
            this.console.log(`Error reading settings: ${error}`);
        }
        return serverSettings;
    }

    protected executeCommand(params: ExecuteCommandParams, token: CancellationToken): Promise<any> {
        return this._controller.execute(params, token);
    }

    protected createImportResolver(fs: VirtualFileSystem, options: ConfigOptions): ImportResolver {
        const resolver = createPyrxImportResolver(fs, options);

        resolver.setStubUsageCallback(importMetrics => {
            if (!importMetrics.isEmpty()) {
                const te = createTelemetryEvent(EventName.IMPORT_METRICS);
                addNumericsToTelemetry(te, importMetrics);
                this._connection.telemetry.logEvent(te);
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
        const workspace = this.getWorkspaceForFile(filePath);
        return CodeActionProvider.getCodeActionsForPosition(workspace, filePath, params.range, token);
    }

    protected onAnalysisCompletedHandler(results: AnalysisResults): void {
        super.onAnalysisCompletedHandler(results);

        const te = this._analysisTracker.updateTelemetry(results);
        if (te) {
            this._connection.telemetry.logEvent(te);

            //send import metrics
            let shouldSend = false;
            const importEvent = createTelemetryEvent(EventName.IMPORT_METRICS);
            this._workspaceMap.forEach(workspace => {
                const resolver = workspace.serviceInstance.getImportResolver();
                if (resolver instanceof PyrxImportResolver) {
                    const importMetrics = resolver.getAndResetImportMetrics();
                    if (!importMetrics.isEmpty()) {
                        addNumericsToTelemetry(importEvent, importMetrics);
                        shouldSend = true;
                    }
                }
            });

            if (shouldSend) {
                this._connection.telemetry.logEvent(importEvent);
            }
        }
    }
}

export const server = new Server();
