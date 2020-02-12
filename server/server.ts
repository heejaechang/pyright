/*
 * server.ts
 *
 * Implements PyRx language server.
 */

 import * as fs from 'fs';
import * as path from 'path';
import { isArray } from 'util';
import { CodeAction, CodeActionParams, Command, ExecuteCommandParams } from 'vscode-languageserver';
import { CommandController } from './commands/commandController';
import * as debug from './pyright/server/src/common/debug';
import { convertUriToPath, normalizeSlashes } from './pyright/server/src/common/pathUtils';
import { LanguageServerBase, ServerSettings, WorkspaceServiceInstance } from './pyright/server/src/languageServerBase';
import { ConfigOptions } from './pyright/server/src/common/configOptions';
import { ImportResolver } from './pyright/server/src/analyzer/importResolver';
import { VirtualFileSystem } from './pyright/server/src/common/vfs';
import { CodeActionProvider } from './pyright/server/src/languageService/codeActionProvider';
import { createPyrxImportResolver } from './pyrxImportResolver';

class Server extends LanguageServerBase {
    private _controller: CommandController;

    constructor() {
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
        const rootDirectory = __dirname;
        debug.assert(fs.existsSync(path.join(rootDirectory, 'typeshed-fallback')), `Unable to locate typeshed fallback folder at '${ rootDirectory }'`);
        super('PyRx', rootDirectory);

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

    protected createImportResolver(fs: VirtualFileSystem, options: ConfigOptions): ImportResolver {
        return createPyrxImportResolver(fs, options);
    }
    
    protected async executeCodeAction(cmdParams: CodeActionParams): Promise<(Command | CodeAction)[] | undefined | null> {
        this.recordUserInteractionTime();

        const filePath = convertUriToPath(cmdParams.textDocument.uri);
        const workspace = this.workspaceMap.getWorkspaceForFile(filePath);
        return CodeActionProvider.getCodeActionsForPosition(workspace, filePath, cmdParams.range);
    }
}

export const server = new Server();
