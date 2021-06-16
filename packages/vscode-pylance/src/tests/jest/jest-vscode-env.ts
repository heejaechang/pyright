// Exposes the Visual Studio Code extension API to the Jest testing environment.
// Tests would otherwise not have access because they are sandboxed.
// See https://github.com/Unibeautify/vscode/blob/61897cd6cd0567db2c8688c3c0b835f9b5c5b446/test/jest-vscode-environment.ts

import NodeEnvironment = require('jest-environment-node');
import * as vscode from 'vscode';

class VsCodeEnvironment extends NodeEnvironment {
    constructor(config: any) {
        super(config);
    }

    public override async setup(): Promise<void> {
        await super.setup();
        this.global.vscode = vscode;
    }

    public override async teardown(): Promise<void> {
        this.global.vscode = {};
        return await super.teardown();
    }
}

module.exports = VsCodeEnvironment;
