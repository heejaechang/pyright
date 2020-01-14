/*
* server.ts
*
* Implements PyRx language server.
*/

import { LanguageServerBase } from './pyright/server/src/languageServerBase';

class Server extends LanguageServerBase {
    constructor() {
        super('PyRx');
    }
}

export const server = new Server();
