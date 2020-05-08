/*
 * expressionWalker.ts
 *
 * AST walker of expressions for IntelliCode.
 */

import {
    ErrorExpressionCategory,
    ErrorNode,
    ExpressionNode,
    FunctionNode,
    MemberAccessNode,
    ParseNode,
    ParseNodeArray,
    ParseNodeType,
} from '../pyright/server/src/parser/parseNodes';
import { BaseParseTreeWalker } from './baseParseTreeWalker';
import { resolveVariable } from './resolution';
import { Scope } from './scope';
import { getStandardVariableType, IntelliCodeConstants, MethodInvokation, StandardVariableType } from './types';

export class ExpressionWalker extends BaseParseTreeWalker {
    methodInvokations: MethodInvokation[] = [];
    methodCount = 0;

    constructor(scopes: Scope[]) {
        super();
        if (scopes.length < 1) {
            throw new Error(this.makeErrorMessage('empty list of scopes.'));
        }
        this.scopes = scopes;
        this._currentScope = this.scopes[0];
    }

    // Scope closure tracking
    visitNode(node: ParseNode): ParseNodeArray {
        this.updateCurrentScope(node);
        return super.visitNode(node);
    }

    visitFunction(node: FunctionNode): boolean {
        const scope = this.scopes!.find((s) => s.node === node);
        if (scope) {
            this._currentScope = scope;
        }
        return true;
    }

    visitMemberAccess(node: MemberAccessNode): boolean {
        if (node.memberName?.value) {
            this.methodCount++;
            this.handleMemberExpression(node.memberName.value, node.leftExpression);
        }
        return true;
    }

    visitError(node: ErrorNode): boolean {
        // Handle 'missing member name'
        if (node.category === ErrorExpressionCategory.MissingMemberAccessName) {
            switch (node.child?.nodeType) {
                case ParseNodeType.Name:
                case ParseNodeType.Call:
                case ParseNodeType.Index:
                case ParseNodeType.String:
                case ParseNodeType.StringList:
                case ParseNodeType.Number:
                case ParseNodeType.List:
                case ParseNodeType.Dictionary:
                case ParseNodeType.Set:
                case ParseNodeType.Tuple:
                    this.handleMemberExpression(undefined, node.child);
                    break;
            }
        }
        return true;
    }

    // Recursively walk through member functions to figure out the invocations
    private handleMemberExpression(
        functionName: string | undefined,
        callTarget: ExpressionNode,
        prevFunctionsCalled?: string
    ): void {
        const callTargetEnd = callTarget.start + callTarget.length;
        switch (callTarget.nodeType) {
            case ParseNodeType.Name:
                {
                    const variableName = callTarget.value;
                    if (!variableName) {
                        return;
                    }

                    let resolvedName = resolveVariable(this._currentScope, variableName, callTarget.start);
                    if (resolvedName) {
                        let spanStart = callTargetEnd;
                        if (prevFunctionsCalled) {
                            resolvedName = `${resolvedName}.${prevFunctionsCalled}`;
                            spanStart += prevFunctionsCalled.length;
                        }
                        this.addMethod(resolvedName, functionName, spanStart);
                    } else if (IntelliCodeConstants.IncludeUnresolvedType) {
                        this.addMethod(IntelliCodeConstants.UnresolvedType, functionName, callTargetEnd);
                    }
                }
                break;

            case ParseNodeType.Call:
                {
                    const target = callTarget.leftExpression;
                    switch (target.nodeType) {
                        case ParseNodeType.MemberAccess:
                            if (target.memberName?.value) {
                                this.handleMemberExpression(
                                    functionName,
                                    target.leftExpression,
                                    prevFunctionsCalled
                                        ? `${target.memberName.value}.${prevFunctionsCalled}`
                                        : target.memberName.value
                                );
                            }
                            break;
                        case ParseNodeType.Name:
                            this.handleMemberExpression(functionName, target, prevFunctionsCalled);
                            break;
                    }
                }
                break;

            case ParseNodeType.MemberAccess:
                {
                    const memberName = callTarget.memberName?.value;
                    if (memberName) {
                        this.handleMemberExpression(
                            functionName,
                            callTarget.leftExpression,
                            prevFunctionsCalled ? `${memberName}.${prevFunctionsCalled}` : memberName
                        );
                    }
                }
                break;

            case ParseNodeType.StringList:
            case ParseNodeType.String:
                this.addMethod(StandardVariableType.String, functionName, callTargetEnd);
                break;
            case ParseNodeType.Number:
                this.addMethod(getStandardVariableType(callTarget), functionName, callTargetEnd);
                break;
            case ParseNodeType.Tuple:
                this.addMethod(StandardVariableType.Tuple, functionName, callTargetEnd);
                break;
            case ParseNodeType.Set:
                this.addMethod(StandardVariableType.Set, functionName, callTargetEnd);
                break;
            case ParseNodeType.List:
                this.addMethod(StandardVariableType.List, functionName, callTargetEnd);
                break;
            case ParseNodeType.Dictionary:
                this.addMethod(StandardVariableType.Dictionary, functionName, callTargetEnd);
                break;
            case ParseNodeType.Index:
                {
                    const target = callTarget.baseExpression;
                    if (target.nodeType === ParseNodeType.Name) {
                        // Type of each list/dictionary item is assigned as String by default.
                        // Default recommendation list will filter out String's recommendation list if actual type is not String.
                        this.addMethod(StandardVariableType.String, functionName, target.start + target.length);
                    }
                }
                break;
        }
    }

    private addMethod(key: string, functionName: string | undefined, index: number): void {
        this.methodInvokations.push(new MethodInvokation(key, functionName, index));
    }
}
