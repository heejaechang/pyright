/*
 * testState.Consts.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Defines consts that will be available to fourslash tests.
 *
 * Make sure to declare consts in fourslash.ts as well to make them available on design time.
 * Ones defined here will be used on runtime.
 */

import * as lsp from 'vscode-languageserver';
import * as cmd from '../../../commands/commands';

export namespace Consts {
    export import CodeActionKind = lsp.CodeActionKind;
    export import Commands = cmd.Commands;
}
