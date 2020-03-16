/*
* completions.ts
*
* Copyright (c) Microsoft Corporation.
* Licensed under the MIT license.

* Defines language service completion list extensibility.
*/

import { CompletionList, Position } from 'vscode-languageserver';
import { ModuleNode } from '../parser/parseNodes';
import { ConfigOptions } from './configOptions';

export interface CompletionListExtension {
    handleCompletions(sourceList: CompletionList, ast: ModuleNode, position: Position, options: ConfigOptions): CompletionList;
}
