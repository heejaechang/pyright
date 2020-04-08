/*
 * baseParseTreeWalker.ts
 *
 * Base AST walker for IntelliCode.
 */

import { ParseTreeWalker } from '../pyright/server/src/analyzer/parseTreeWalker';
import { ParseNode, ParseNodeType } from '../pyright/server/src/parser/parseNodes';
import { getEnclosingScopeForNode, Scope } from './scope';

export class BaseParseTreeWalker extends ParseTreeWalker {
    // Current scope's function node
    protected _currentScope: Scope;

    scopes: Scope[] = [];

    protected makeErrorMessage(message: string) {
        return `IntelliCode AST walker: ${message}`;
    }

    protected updateCurrentScope(node: ParseNode): void {
        const enclosingTreeScope = getEnclosingScopeForNode(node);
        if (
            (node.nodeType === ParseNodeType.Function || node.nodeType === ParseNodeType.Class) &&
            this._currentScope.node === node
        ) {
            // Function or class define this scope so processing them would move us up unnecessarily.
            return;
        }
        // Verify that we are still in the current scope.
        if (this._currentScope.node != enclosingTreeScope) {
            const index = this.scopes.findIndex((s) => s.node === enclosingTreeScope);
            if (index >= 0) {
                this._currentScope = this.scopes[index];
            }
        }
    }
}
