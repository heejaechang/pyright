// Exposes the Visual Studio Code extension API to the Jest testing environment.
// Tests would otherwise not have access because they are sandboxed.
// See https://github.com/Unibeautify/vscode/blob/61897cd6cd0567db2c8688c3c0b835f9b5c5b446/test/jest-vscode-environment.ts

import NodeEnvironment = require('../../../node_modules/jest-environment-node/build');
import * as vscode from 'vscode';

class VsCodeEnvironment extends NodeEnvironment {
    constructor(config: any) {
        super(config);
    }

    public async setup(): Promise<void> {
        await super.setup();
        this.global.vscode = vscode;
    }

    public async teardown(): Promise<void> {
        this.global.vscode = {};
        return await super.teardown();
    }
}

module.exports = VsCodeEnvironment;
