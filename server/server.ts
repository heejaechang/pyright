/*
* server.ts
*
* Implements PyRx language server.
*/

import { LanguageServerBase } from './pyright/server/src/languageServerBase';
import { getDirectoryPath } from './pyright/server/src/common/pathUtils';

class Server extends LanguageServerBase {
    constructor() {
        // Point Pyright to the bundle directory since PyRx packages 
        // Pyright differently from the Pyright VSC extension.
        // TODO: provide it in the constructor? This would probably involve 
        // Pyright modification so it would not use '(global as any).__rootDirectory' 
        // and rather have it as a setting.
        super('PyRx', getDirectoryPath(__dirname));
    }
}

export const server = new Server();
