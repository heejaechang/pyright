/*
 * scope.ts
 *
 * Scope related functions for IntelliCode.
 */

import { fail } from 'pyright-internal/common/debug';
import { ClassNode, FunctionNode, ModuleNode, ParseNode, ParseNodeType } from 'pyright-internal/parser/parseNodes';

import { Assignment } from './types';

export class Scope {
    public assignments: Assignment[];

    constructor(
        public readonly name: string,
        public readonly spanStart: number,
        public readonly parent: Scope | null,
        // Scope defining node.
        public readonly node: ClassNode | FunctionNode | ModuleNode,
        // Collection of assignments
        assignments?: Assignment[]
    ) {
        this.assignments = assignments || [];
    }
}

export function getEnclosingScopeForNode(node: ParseNode): ClassNode | FunctionNode | ModuleNode {
    // For module scope defining node is the module.
    // For class/function we need to step out and walk up, locating outer scope definition.
    // For all other nodes just walk up to the nearest scope definition.
    if (node.nodeType === ParseNodeType.Module) {
        return node;
    }

    let curNode: ParseNode | undefined = node;
    // For scope-defining nodes return outer scope.
    if (node.nodeType === ParseNodeType.Function || node.nodeType === ParseNodeType.Class) {
        curNode = node.parent;
    }

    while (curNode) {
        switch (curNode.nodeType) {
            case ParseNodeType.Module:
            case ParseNodeType.Function:
            case ParseNodeType.Class:
                return curNode;
        }
        curNode = curNode.parent;
    }

    fail('Did not find tree scope');
    return undefined!;
}

export function getScopeNodeName(node: ClassNode | FunctionNode): string {
    switch (node.nodeType) {
        case ParseNodeType.Function:
            return node.name?.value || '?';
        case ParseNodeType.Class:
            return node.name?.value || '?';
    }
}

export function getScopeQualifiedName(node: ClassNode | FunctionNode): string {
    const enclosingScope = getEnclosingScopeForNode(node);
    const scopeNodeName = getScopeNodeName(node);
    return enclosingScope.nodeType === ParseNodeType.Module
        ? scopeNodeName
        : `${getScopeQualifiedName(enclosingScope)}.${scopeNodeName}`;
}
