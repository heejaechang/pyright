/*
 * server.ts
 *
 * Implements PyRx language server.
 */
'use strict';

import * as fs from 'fs';
import * as path from 'path';
import { isArray } from 'util';
import { CodeAction, CodeActionParams, Command, ExecuteCommandParams } from 'vscode-languageserver';
import { CommandController } from './commands/commandController';
import * as debug from './pyright/server/src/common/debug';
import { convertUriToPath, getDirectoryPath, normalizeSlashes } from './pyright/server/src/common/pathUtils';
import { LanguageServerBase, ServerSettings, WorkspaceServiceInstance } from './pyright/server/src/languageServerBase';
import { CodeActionProvider } from './pyright/server/src/languageService/codeActionProvider';

class Server extends LanguageServerBase {
    private _controller: CommandController;

    constructor() {
        debug.assert(fs.existsSync(path.join(__dirname, 'typeshed-fallback')), 'Unable to locate typeshed fallback folder.');
        super('PyRx', getDirectoryPath(__dirname));
        this._controller = new CommandController(this);
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
                serverSettings.openFilesOnly = !!pythonAnalysisSection.openFilesOnly;
                serverSettings.useLibraryCodeForTypes = !!pythonAnalysisSection.useLibraryCodeForTypes;
            } else {
                serverSettings.openFilesOnly = true;
                serverSettings.useLibraryCodeForTypes = true;
            }
        } catch (error) {
            this.console.log(`Error reading settings: ${ error }`);
        }
        return serverSettings;
    }

    protected executeCommand(cmdParams: ExecuteCommandParams): Promise<any> {
        return this._controller.execute(cmdParams);
    }

    protected async executeCodeAction(cmdParams: CodeActionParams): Promise<(Command | CodeAction)[] | undefined | null> {
        this.recordUserInteractionTime();

        const filePath = convertUriToPath(cmdParams.textDocument.uri);
        const workspace = this.workspaceMap.getWorkspaceForFile(filePath);
        return CodeActionProvider.getCodeActionsForPosition(workspace, filePath, cmdParams.range);
    }
}

export const server = new Server();
