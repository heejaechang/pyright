/*
 * server.ts
 *
 * Implements PyRx language server.
 */
'use strict';

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { isArray } from 'util';
import { LanguageServerBase, ServerSettings, WorkspaceServiceInstance } from './pyright/server/src/languageServerBase';

class Server extends LanguageServerBase {
    constructor() {
        assert(fs.existsSync(path.join(__dirname, 'typeshed-fallback')), 'Unable to locate typeshed fallback folder.');
        super('PyRx', __dirname, 'mspythonconfig.json');
        this.console.log(`PyRx server root directory: ${__dirname}`);
    }

    async getSettings(workspace: WorkspaceServiceInstance): Promise<ServerSettings> {
        const serverSettings: ServerSettings = {
            disableLanguageServices: false
        };

        try {
            const pythonSection = await this.getConfiguration(workspace, 'python');
            if (pythonSection) {
                serverSettings.pythonPath = pythonSection.pythonPath;
                serverSettings.venvPath = pythonSection.venvPath;
            }

            const pythonAnalysisSection = await this.getConfiguration(workspace, 'python.analysis');
            if (pythonAnalysisSection) {
                const typeshedPaths = pythonAnalysisSection.typeshedPaths;
                if (typeshedPaths && isArray(typeshedPaths) && typeshedPaths.length > 0) {
                    serverSettings.typeshedPath = typeshedPaths[0];
                }
                serverSettings.openFilesOnly = !!pythonAnalysisSection.openFilesOnly;
                serverSettings.useLibraryCodeForTypes = !!pythonAnalysisSection.useLibraryCodeForTypes;
            } else {
                serverSettings.openFilesOnly = true;
                serverSettings.useLibraryCodeForTypes = true;
            }
        } catch (error) {
            this.console.log(`Error reading settings: ${error}`);
        }
        return serverSettings;
    }
}

export const server = new Server();
