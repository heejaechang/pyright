/*
 * server.ts
 *
 * Implements PyRx language server.
 */
'use strict';

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { LanguageServerBase } from './pyright/server/src/languageServerBase';

class Server extends LanguageServerBase {
    constructor() {
        assert(fs.existsSync(path.join(__dirname, 'typeshed-fallback')), 'Unable to locate typeshed fallback folder.');
        super('PyRx', __dirname);
        this.console.log(`PyRx server root directory: ${__dirname}`);
    }
}

export const server = new Server();
