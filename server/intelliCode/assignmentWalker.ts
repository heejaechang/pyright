/*
 * assignmentWalker.ts
 *
 * AST walker of assignments.
 */

import { ParseTreeWalker } from '../pyright/server/src/analyzer/parseTreeWalker';
import {
    AssignmentNode,
    CallNode,
    ClassNode,
    ExpressionNode,
    ForNode,
    FunctionNode,
    ImportFromNode,
    ImportNode,
    ListComprehensionForNode,
    MemberAccessNode,
    ModuleNode,
    NameNode,
    ParseNode,
    ParseNodeArray,
    ParseNodeType,
    WithNode
} from '../pyright/server/src/parser/parseNodes';
import { Assignment, getStandardVariableType, IntelliCodeConstants, Scope, StandardVariableType } from './nodes';

export class AssignmentWalker extends ParseTreeWalker {
    // Walk results
    public scopes: Scope[];
    // Current scope's function node
    private _currentScope: Scope;

    // Scope closure tracking
    visitNode(node: ParseNode): ParseNodeArray {
        this.updateCurrentScope(node);
        return super.visitNode(node);
    }

    visitClass(node: ClassNode): boolean {
        return this.handleClassOrFunction(node);
    }

    visitFunction(node: FunctionNode): boolean {
        return this.handleClassOrFunction(node);
    }

    visitAssignment(node: AssignmentNode): boolean {
        if (node.leftExpression.nodeType == ParseNodeType.Name) {
            const n = node.leftExpression;
            this.handleAssignment(n.value, n.start, node.rightExpression);
        }
        return false;
    }

    // Handle from import assignments
    visitImportFrom(node: ImportFromNode): boolean {
        if (!node.module) {
            // Module name is missing
            if (node.imports.length > 0) {
                const nameNode = node.imports[0]?.name;
                if (nameNode?.value) {
                    this._currentScope.assignments.push(
                        new Assignment(nameNode.value, nameNode.value, nameNode.start + nameNode.length)
                    );
                }
            }
            return false;
        }

        const rootModuleName = node.module.nameParts.map(p => p.value || '').join('.');
        for (const asNameNode of node.imports) {
            const name = asNameNode.name;
            const asName = asNameNode.alias;
            if (name.value) {
                if (asName?.value) {
                    this._currentScope.assignments.push(
                        new Assignment(asName.value, rootModuleName + '.' + name.value, name.start + name.length)
                    );
                } else {
                    this._currentScope.assignments.push(
                        new Assignment(name.value, name.value, name.start + name.length)
                    );
                }
            } else if (asName?.value) {
                this._currentScope.assignments.push(
                    new Assignment(asName.value, asName.value, asName.start + asName.length)
                );
            }
        }
        return false;
    }

    // Handle import assignments
    visitImport(node: ImportNode): boolean {
        for (const asNameNode of node.list) {
            const nameParts = asNameNode.module.nameParts;
            if (nameParts.length > 0) {
                const name = nameParts.map(p => p.value || '').join('.');
                const asName = asNameNode.alias;
                if (asName?.value) {
                    this._currentScope.assignments.push(
                        new Assignment(asName.value, name, nameParts[0].start + name.length)
                    );
                } else {
                    this._currentScope.assignments.push(new Assignment(name, name, nameParts[0].start + name.length));
                }
            }
        }
        return false;
    }

    visitWith(node: WithNode): boolean {
        for (const withItemNode of node.withItems.filter(
            n =>
                n.expression?.nodeType === ParseNodeType.Call &&
                n.expression.leftExpression.nodeType === ParseNodeType.Name &&
                n.target?.nodeType === ParseNodeType.Name
        )) {
            const variableName = withItemNode.target as NameNode;
            const callName = (withItemNode.expression as CallNode).leftExpression as NameNode;
            if (variableName?.value && callName?.value) {
                this._currentScope.assignments.push(
                    new Assignment(variableName.value, callName.value, callName.start + callName.length)
                );
            }
        }
        return false;
    }

    // Handle assignments in for loops elements.
    // for p in list: p becomes list.element_inside.
    visitFor(node: ForNode): boolean {
        const elementInsideString = 'element_inside';
        if (node.targetExpression.nodeType != ParseNodeType.Name) {
            return false;
        }

        const target = node.targetExpression;
        const targetName = target.value;

        switch (node.iterableExpression.nodeType) {
            case ParseNodeType.Name:
                {
                    const listName = node.iterableExpression;
                    if (!listName.value) {
                        break;
                    }
                    let resolvedName = this.resolveVariable(this._currentScope, listName.value, listName.start);
                    if (IntelliCodeConstants.UnresolvedType && !resolvedName) {
                        resolvedName = IntelliCodeConstants.UnresolvedType;
                    }
                    if (!resolvedName || !targetName) {
                        break;
                    }
                    this._currentScope.assignments.push(
                        new Assignment(
                            targetName,
                            `${resolvedName}.${elementInsideString}`,
                            target.start + target.length
                        )
                    );
                }
                break;

            case ParseNodeType.Call:
                {
                    const callTarget = node.iterableExpression.leftExpression;
                    if (callTarget.nodeType == ParseNodeType.MemberAccess) {
                        this.handleMemberExpression(targetName, target.start, callTarget, elementInsideString);
                    }
                }
                break;

            case ParseNodeType.MemberAccess:
                this.handleMemberExpression(targetName, target.start, node.iterableExpression, elementInsideString);
                break;
        }
        return false;
    }

    visitListComprehensionFor(node: ListComprehensionForNode): boolean {
        if (
            node.targetExpression.nodeType != ParseNodeType.Name ||
            node.iterableExpression.nodeType != ParseNodeType.List
        ) {
            return false;
        }
        const key = node.targetExpression.value;
        if (!key) {
            return false;
        }
        const list = node.iterableExpression;
        if (!list.entries || list.entries.length == 0) {
            return false;
        }
        const entry = list.entries[0];
        const type = getStandardVariableType(entry);
        if (type != StandardVariableType.Null) {
            this._currentScope.assignments.push(new Assignment(key, type, entry.start));
        }
        return false;
    }

    private handleAssignment(leftVariableName: string, startIndex: number, right: ExpressionNode): void {
        switch (right.nodeType) {
            case ParseNodeType.Call:
                {
                    // q = a.count().bitLength()
                    if (right.leftExpression.nodeType == ParseNodeType.MemberAccess) {
                        this.handleMemberExpression(leftVariableName, startIndex, right.leftExpression, '');
                    } else if (right.leftExpression.nodeType == ParseNodeType.Name) {
                        // y = open()
                        const functionName = right.leftExpression.value; // open
                        this._currentScope.assignments.push(
                            new Assignment(
                                leftVariableName,
                                functionName,
                                right.leftExpression.start + right.leftExpression.length
                            )
                        );
                    } else if (right.leftExpression) {
                        this.handleAssignment(leftVariableName, startIndex, right.leftExpression);
                    }
                }
                break;

            case ParseNodeType.Number:
                {
                    // a = 1
                    this._currentScope.assignments.push(
                        new Assignment(
                            leftVariableName,
                            Math.round(right.value) == right.value
                                ? StandardVariableType.Int
                                : StandardVariableType.Float,
                            startIndex
                        )
                    );
                }
                break;

            case ParseNodeType.String:
            case ParseNodeType.StringList: // a = "string";
                this._currentScope.assignments.push(
                    new Assignment(leftVariableName, StandardVariableType.String, startIndex)
                );
                break;

            case ParseNodeType.Name:
                {
                    // check for assignments p = q
                    const value = this.resolveVariable(this._currentScope, right.value, right.start);
                    if (value && value.length > 0) {
                        this._currentScope.assignments.push(new Assignment(leftVariableName, value, startIndex));
                    }
                }
                break;

            case ParseNodeType.Tuple:
                this._currentScope.assignments.push(
                    new Assignment(leftVariableName, StandardVariableType.Tuple, startIndex)
                );
                break;

            case ParseNodeType.Dictionary:
                this._currentScope.assignments.push(
                    new Assignment(leftVariableName, StandardVariableType.Dictionary, startIndex)
                );
                break;

            case ParseNodeType.Set:
                this._currentScope.assignments.push(
                    new Assignment(leftVariableName, StandardVariableType.Set, startIndex)
                );
                break;

            case ParseNodeType.List:
            case ParseNodeType.ListComprehension:
                this._currentScope.assignments.push(
                    new Assignment(leftVariableName, StandardVariableType.List, startIndex)
                );
                break;
        }
    }

    private handleClassOrFunction(node: ClassNode | FunctionNode): boolean {
        this._currentScope = new Scope(node.name.value, node.start, this._currentScope, node);
        this.scopes.push(this._currentScope);
        return true;
    }

    // Recursively walk through member assignments
    private handleMemberExpression(
        leftVariableName: string,
        leftStartIndex: number,
        m: MemberAccessNode,
        rightHandSide: string
    ): void {
        const functionName = m.memberName?.value; // bitLength // count
        if (!functionName || !m.leftExpression) {
            return;
        }
        const target = m.leftExpression;
        switch (target.nodeType) {
            case ParseNodeType.Name:
                {
                    let targetName = target.value;
                    if (targetName === 'self') {
                        return;
                    }
                    const resolvedName = this.resolveVariable(this._currentScope, targetName, m.leftExpression.start);
                    targetName =
                        resolvedName && resolvedName.length > 0
                            ? resolvedName
                            : IntelliCodeConstants.IncludeUnresolvedType
                            ? IntelliCodeConstants.UnresolvedType
                            : targetName;
                    const combineNamed =
                        targetName === IntelliCodeConstants.UnresolvedType
                            ? IntelliCodeConstants.UnresolvedType
                            : `${targetName}.${this.resolveFunction(rightHandSide, functionName)}`;
                    this._currentScope.assignments.push(
                        new Assignment(leftVariableName, combineNamed, target.start + target.length)
                    );
                }
                break;

            case ParseNodeType.StringList:
            case ParseNodeType.String:
                {
                    const combineNamed = `${StandardVariableType.String}.${this.resolveFunction(
                        rightHandSide,
                        functionName
                    )}`;
                    this._currentScope.assignments.push(
                        new Assignment(leftVariableName, combineNamed, target.start + target.length)
                    );
                }
                break;

            case ParseNodeType.Number:
                {
                    const combineNamed = `${getStandardVariableType(target)}.${this.resolveFunction(
                        rightHandSide,
                        functionName
                    )}`;
                    this._currentScope.assignments.push(
                        new Assignment(leftVariableName, combineNamed, target.start + target.length)
                    );
                }
                break;

            case ParseNodeType.Call:
                {
                    const callTarget = target.leftExpression;
                    if (callTarget.nodeType === ParseNodeType.MemberAccess) {
                        this.handleMemberExpression(
                            leftVariableName,
                            leftStartIndex,
                            callTarget,
                            this.resolveFunction(rightHandSide, functionName)
                        );
                    } else if (callTarget.nodeType === ParseNodeType.Name) {
                        const combineNamed = `${callTarget.value}.${this.resolveFunction(rightHandSide, functionName)}`;
                        this._currentScope.assignments.push(
                            new Assignment(leftVariableName, combineNamed, target.start + target.length)
                        );
                    }
                }
                break;

            case ParseNodeType.MemberAccess:
                this.handleMemberExpression(
                    leftVariableName,
                    leftStartIndex,
                    target,
                    this.resolveFunction(rightHandSide, functionName)
                );
                break;

            case ParseNodeType.Index:
                {
                    if (target.baseExpression.nodeType === ParseNodeType.MemberAccess) {
                        this.handleMemberExpression(
                            leftVariableName,
                            leftStartIndex,
                            target.baseExpression,
                            this.resolveFunction(rightHandSide, functionName)
                        );
                    } else if (target.baseExpression.nodeType === ParseNodeType.Name) {
                        this.handleAssignment(leftVariableName, leftStartIndex, target.baseExpression);
                    }
                }
                break;
        }
    }

    private resolveFunction(rightHandSide: string, functionName: string): string {
        return rightHandSide && rightHandSide.length > 0 ? `${functionName}.${rightHandSide}` : functionName;
    }

    // Resolve variable from a scope upwards until reaches root
    private resolveVariable(scope: Scope, variableName: string, beforeIndex: number): string | undefined {
        if (!variableName || !scope || (!scope.parent && (!scope.assignments || scope.assignments.length === 0))) {
            return variableName;
        }
        let currentScope = scope;
        const assignments = currentScope.assignments;
        let result = this.resolveAssignments(assignments, variableName, beforeIndex);
        while (!result && currentScope.parent) {
            currentScope = currentScope.parent;
            result = this.resolveAssignments(assignments, variableName, beforeIndex);
        }
        return result;
    }

    // Evaluate previous assignments to resolve defined variable types
    private resolveAssignments(
        assignments: Assignment[] | undefined,
        variableName: string,
        beforeIndex: number
    ): string | undefined {
        if (!assignments) {
            return undefined;
        }
        // Resolve from back to front, variable type is always the latest defined
        let resolvedName: string | undefined;
        for (let i = assignments.length - 1; i >= 0; i--) {
            const prevAssignment = assignments[i];
            if (prevAssignment.spanStart > beforeIndex) {
                continue;
            }

            if (prevAssignment.key === variableName && !resolvedName) {
                resolvedName = prevAssignment.value;
            } else if (resolvedName === prevAssignment.key) {
                resolvedName = prevAssignment.value;
            }
        }
        return resolvedName;
    }

    private getEnclosingScopeForNode(node: ParseNode): ClassNode | FunctionNode | ModuleNode {
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

    private updateCurrentScope(node: ParseNode): void {
        const enclosingTreeScope = this.getEnclosingScopeForNode(node);
        // Check if this is first visit to the module.
        switch (node.nodeType) {
            case ParseNodeType.Module:
                // Entering module, create new scope chain.
                this._currentScope = new Scope('<module>', 0, null, enclosingTreeScope, []);
                this.scopes = [this._currentScope];
                break;
            default:
                if (
                    (node.nodeType === ParseNodeType.Function || node.nodeType === ParseNodeType.Class) &&
                    this._currentScope.node === node
                ) {
                    // Function or class define this scope so processing them would move us up unnecessarily.
                    break;
                }
                // Verify that we are still in the current scope.
                if (this._currentScope.node != enclosingTreeScope) {
                    const index = this.scopes.findIndex(s => s.node === enclosingTreeScope);
                    if (index >= 0) {
                        this._currentScope = this.scopes[index];
                    }
                }
                break;
        }
    }
}
