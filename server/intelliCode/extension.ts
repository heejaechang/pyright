/*
* extension.ts
*
* Language service extension implementing IntelliCode.
*/

import { CompletionListExtension } from '../pyright/server/src/common/extensibility';
import { Position } from 'vscode';
import { ModuleNode } from '../pyright/server/src/parser/parseNodes';
import { ConfigOptions } from '../pyright/server/src/common/configOptions';
import { CompletionList } from 'vscode-languageserver';

export class IntelliCodeExtension implements CompletionListExtension {
    handleCompletions(sourceList: CompletionList, ast: ModuleNode, position: Position, options: ConfigOptions): CompletionList {
        return sourceList;
    } 
}