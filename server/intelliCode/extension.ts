/*
 * extension.ts
 *
 * Language service extension implementing IntelliCode.
 */

import { Position } from 'vscode';
import { CompletionList } from 'vscode-languageserver';

import { ConfigOptions } from '../pyright/server/src/common/configOptions';
import { CompletionListExtension, LanguageServiceExtension } from '../pyright/server/src/common/extensibility';
import { ModuleNode } from '../pyright/server/src/parser/parseNodes';

export class IntelliCodeExtension implements LanguageServiceExtension {
    completionListExtension: CompletionListExtension = new IntelliCodeCompletionListExtension();
}

class IntelliCodeCompletionListExtension implements CompletionListExtension {
    updateCompletionList(
        sourceList: CompletionList,
        ast: ModuleNode,
        position: Position,
        options: ConfigOptions
    ): CompletionList {
        return sourceList;
    }
}
