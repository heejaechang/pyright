/*
 * refactoringProvider.ts
 * Copyright (c) Microsoft Corporation.
 *
 *  A collection of code refactoring tools
 */

import { CancellationToken } from 'vscode-languageserver';

import * as AnalyzerNodeInfo from 'pyright-internal/analyzer/analyzerNodeInfo';
import { ReturnFinder, YieldFinder } from 'pyright-internal/analyzer/binder';
import {
    findNodeByOffset,
    getEnclosingClassOrModule,
    getEnclosingSuiteOrModule,
} from 'pyright-internal/analyzer/parseTreeUtils';
import * as ParseTreeUtils from 'pyright-internal/analyzer/parseTreeUtils';
import { ParseTreeWalker } from 'pyright-internal/analyzer/parseTreeWalker';
import { FunctionTypeResult, TypeEvaluator } from 'pyright-internal/analyzer/typeEvaluator';
import { FunctionType } from 'pyright-internal/analyzer/types';
import { FileEditAction } from 'pyright-internal/common/editAction';
import {
    convertOffsetsToRange,
    convertOffsetToPosition,
    convertRangeToTextRange,
} from 'pyright-internal/common/positionUtils';
import { comparePositions, Position, Range, TextRange } from 'pyright-internal/common/textRange';
import { TextRangeCollection } from 'pyright-internal/common/textRangeCollection';
import { FindReferencesTreeWalker, ReferencesResult } from 'pyright-internal/languageService/referencesProvider';
import {
    BreakNode,
    ContinueNode,
    FunctionNode,
    isExpressionNode,
    ModuleNode,
    ParseNode,
    ParseNodeArray,
    ParseNodeType,
    SuiteNode,
} from 'pyright-internal/parser/parseNodes';
import { ParseResults } from 'pyright-internal/parser/parser';
import { KeywordType } from 'pyright-internal/parser/tokenizerTypes';

import { formatCode } from '../common/formatter';

enum StepDirection {
    Backward = 0,
    Forward,
}

export enum CannotExtractReason {
    None = 0,
    InvalidTargetSelected = 'Invalid Target Selected',
    InvalidExpressionSelected = 'Invalid Expression Selected',
    InvalidExpressionAndStatementSelected = 'Invalid Expression and Statement Selected',
    ContainsYieldExpression = 'Cannot extract yield',
    ContainsContinueWithoutLoop = 'Cannot extract continue without enclosing while/for loop',
    ContainsBreakWithoutLoop = 'Cannot extract break without enclosing while/for loop',
    ContainsReturnExpression = 'Cannot extract return',
    ContainsMultipleReturns = 'Cannot extract multiple returns',
    ReturnShouldBeLastStatement = 'Return should be last statement',
    ContainsPartialIfElseStatement = 'Cannot extract partial if/else statement',
}

interface SelectionInfo {
    failedReason: CannotExtractReason;
    range?: TextRange;
    parentNode?: SuiteNode | ModuleNode;
    bodyNodes?: ParseNodeArray;
    isExpression?: boolean;
}

interface FunctionInfo {
    isStaticMethod: boolean; // has @staticmethod decorator
    isClassMethod: boolean; // has @classmethod decorator
    isBoundToClass: boolean; // function is inside class
    className?: string; //enclosing class name
    firstParam?: string; // first paramter of enclosing function
    node?: FunctionNode;
    functionTypeResult?: FunctionTypeResult;
    indentionOffset: number;
    insertPosition: Position;
}

export class ExtractMethodProvider {
    static extractVariable(
        filePath: string,
        parseResults: ParseResults,
        range: Range,
        token: CancellationToken
    ): FileEditAction[] {
        if (parseResults === undefined || filePath === undefined) {
            return [];
        }

        const textRange = convertRangeToTextRange(range, parseResults.tokenizerOutput.lines);
        if (!textRange) {
            return [];
        }

        const selectionInfo = this.canExtractVariable(parseResults, textRange);
        if (selectionInfo.failedReason !== CannotExtractReason.None) {
            throw new Error(selectionInfo.failedReason);
        }

        if (token.isCancellationRequested) {
            return [];
        }

        const editActions: FileEditAction[] = this._extractVariableGenerator(filePath, selectionInfo, parseResults);

        return editActions;
    }

    private static _extractVariableGenerator(
        filePath: string,
        selectionInfo: SelectionInfo,
        parseResults: ParseResults
    ) {
        if (
            selectionInfo.parentNode === undefined ||
            selectionInfo.bodyNodes === undefined ||
            selectionInfo.range === undefined
        ) {
            return [];
        }

        let generatedName: string;
        const enclosedFunction = ParseTreeUtils.getEnclosingFunction(selectionInfo.parentNode);
        if (enclosedFunction !== undefined) {
            generatedName = generateUniqueNameInFunction('new_var', enclosedFunction);
        } else {
            generatedName = generateUniqueNameInClassOrModule('new_var', selectionInfo.parentNode);
        }

        const generatedAssignment =
            generatedName +
            ' = ' +
            this._expressionNodesToString(selectionInfo.bodyNodes, parseResults, selectionInfo.range);

        const editActions: FileEditAction[] = [];
        editActions.push({
            replacementText: generatedName,
            filePath: filePath,
            range: convertOffsetsToRange(
                selectionInfo.range.start,
                TextRange.getEnd(selectionInfo.range),
                parseResults.tokenizerOutput.lines
            ),
        });

        // Find the statement containing the extract variable selection so that we can insert ahead of it.
        const statementContainingSelection = selectionInfo.parentNode.statements?.find((statement) => {
            const statementRange = TextRange.create(statement.start, statement.length);
            return TextRange.contains(statementRange, selectionInfo.range!.start);
        });

        if (statementContainingSelection) {
            // find the statement that contains the selection
            const insertOffset = statementContainingSelection.start;
            const indentOffset = convertOffsetToPosition(
                statementContainingSelection.start,
                parseResults.tokenizerOutput.lines
            ).character;

            //insert at beginning of the selection line
            editActions.push({
                replacementText: generatedAssignment + '\n' + ' '.repeat(indentOffset),
                filePath: filePath,
                range: convertOffsetsToRange(insertOffset, insertOffset, parseResults.tokenizerOutput.lines),
            });
        }
        return editActions;
    }

    static extractMethod(
        filePath: string,
        parseResults: ParseResults,
        range: Range,
        evaluator: TypeEvaluator,
        token: CancellationToken
    ): FileEditAction[] {
        if (parseResults === undefined || evaluator === undefined || filePath === undefined) {
            return [];
        }

        const textRange = convertRangeToTextRange(range, parseResults.tokenizerOutput.lines);
        if (!textRange) {
            return [];
        }

        const selectionInfo = this.canExtractMethod(parseResults, textRange, evaluator);
        if (selectionInfo.failedReason !== CannotExtractReason.None) {
            throw new Error(selectionInfo.failedReason);
        }

        if (token.isCancellationRequested) {
            return [];
        }

        if (
            selectionInfo.range === undefined ||
            selectionInfo.bodyNodes === undefined ||
            selectionInfo.parentNode === undefined
        ) {
            throw new Error(CannotExtractReason.InvalidTargetSelected);
        }

        const symbolReferences = this._findSymbolsReferences(selectionInfo.parentNode, parseResults, evaluator, token);
        const signatureSymbols = this._findSignatureSymbols(symbolReferences, selectionInfo.range, parseResults, token);
        const outputSymbols = this._findOutputSymbols(symbolReferences, selectionInfo.range, parseResults, token);

        if (token.isCancellationRequested) {
            return [];
        }

        const editActions = this._extractMethodGenerator(
            signatureSymbols,
            outputSymbols,
            selectionInfo,
            parseResults,
            evaluator,
            filePath
        );

        return editActions;
    }

    private static _findSymbolsReferences(
        parentNode: ParseNode | undefined,
        parseResults: ParseResults,
        evaluator: TypeEvaluator,
        token: CancellationToken
    ) {
        const symbolReferences = new Map<string, ReferencesResult>();
        if (parentNode === undefined) {
            return symbolReferences;
        }

        const executionScope = ParseTreeUtils.getEvaluationScopeNode(parentNode);
        const scope = AnalyzerNodeInfo.getScope(executionScope);

        scope?.symbolTable.forEach((symbol, name) => {
            if (token.isCancellationRequested) {
                return;
            }

            const requiresGlobalSearch = false;
            const referencesResult = new ReferencesResult(
                requiresGlobalSearch,
                parentNode,
                name,
                symbol.getDeclarations()
            );

            const includeDeclaration = true;
            const refTreeWalker = new FindReferencesTreeWalker(
                parseResults,
                '',
                referencesResult,
                includeDeclaration,
                evaluator,
                token
            );

            referencesResult.addLocations(...refTreeWalker.findReferences());

            symbolReferences.set(name, referencesResult);
        });
        return symbolReferences;
    }

    static canExtractVariable(parseResults: ParseResults, selRange: TextRange): SelectionInfo {
        let parentNode: SuiteNode | ModuleNode | undefined = undefined;
        let bodyNodes: ParseNodeArray | undefined = undefined;
        let range: TextRange | undefined = undefined;

        try {
            if (selRange.length === 0) {
                return { failedReason: CannotExtractReason.InvalidExpressionSelected };
            }

            range = this.verifyAndAdjustSelectionNodes(parseResults, selRange);
            if (range === undefined) {
                return { failedReason: CannotExtractReason.InvalidExpressionSelected };
            }

            parentNode = this._findParentForRange(parseResults.parseTree, range);
            if (!parentNode) {
                return { failedReason: CannotExtractReason.InvalidExpressionSelected };
            }

            bodyNodes = this._findNodesInRange(parentNode, range);
            if (bodyNodes === undefined || bodyNodes.length === 0) {
                return { failedReason: CannotExtractReason.InvalidTargetSelected };
            }

            const containsOnlyExpression = bodyNodes.every((node) => this._isExpression(node));
            if (!containsOnlyExpression) {
                return { failedReason: CannotExtractReason.InvalidExpressionSelected };
            }

            const startNode = findNodeByOffset(parseResults.parseTree, range.start);
            if (!startNode) {
                return { failedReason: CannotExtractReason.InvalidExpressionSelected };
            }

            if (!this._isValidExtractionNode(startNode)) {
                return { failedReason: CannotExtractReason.InvalidExpressionSelected };
            }

            return {
                range,
                parentNode,
                bodyNodes,
                failedReason: CannotExtractReason.None,
                isExpression: containsOnlyExpression,
            };
        } catch (error) {
            return { failedReason: CannotExtractReason.InvalidExpressionSelected };
        }
    }

    static canExtractMethod(
        parseResults: ParseResults,
        selectionRange: TextRange,
        evaluator: TypeEvaluator | undefined
    ): SelectionInfo {
        try {
            if (selectionRange.length === 0) {
                return { failedReason: CannotExtractReason.InvalidExpressionSelected };
            }

            if (evaluator === undefined) {
                return { failedReason: CannotExtractReason.InvalidExpressionSelected };
            }

            const adjRange = this.verifyAndAdjustSelectionNodes(parseResults, selectionRange);
            if (adjRange === undefined) {
                return { failedReason: CannotExtractReason.InvalidTargetSelected };
            }

            const parentNode = this._findParentForRange(parseResults.parseTree, adjRange);
            if (!parentNode) {
                return { failedReason: CannotExtractReason.InvalidTargetSelected };
            }

            const returnFailure = this._verifyReturnStatements(parentNode, evaluator, adjRange);
            if (returnFailure !== CannotExtractReason.None) {
                return { failedReason: returnFailure };
            }

            const bodyNodes = this._findNodesInRange(parentNode, adjRange);
            if (bodyNodes === undefined || bodyNodes.length === 0) {
                return { failedReason: CannotExtractReason.InvalidTargetSelected };
            }

            const isExpression = bodyNodes.every((node) => this._isExpression(node));

            const failedReason = this._checkUnsupportedExpressions(parentNode, bodyNodes, adjRange, isExpression);

            return { range: adjRange, parentNode, bodyNodes, failedReason, isExpression };
        } catch (error) {
            return { failedReason: CannotExtractReason.InvalidExpressionAndStatementSelected };
        }
    }

    private static _verifyReturnStatements(
        parentNode: ParseNode,
        evaluator: TypeEvaluator,
        adjRange: TextRange
    ): CannotExtractReason {
        const enclosingFunctionNode = ParseTreeUtils.getEnclosingFunction(parentNode);
        if (enclosingFunctionNode !== undefined) {
            const functionTypeResult = evaluator.getTypeOfFunction(enclosingFunctionNode);
            const returnStatements = functionTypeResult?.functionType.details.declaration?.returnStatements;
            if (returnStatements && returnStatements.length > 1) {
                const returnsInSelection = returnStatements.filter((node) => TextRange.contains(adjRange, node.start));
                if (returnsInSelection.length > 1) {
                    return CannotExtractReason.ContainsMultipleReturns;
                }

                const hasNonFinalReturnStatement = returnStatements
                    .slice(0, -1) // remove final return from possible matches
                    .some((node) => TextRange.contains(adjRange, node.start));
                if (hasNonFinalReturnStatement) {
                    return CannotExtractReason.ReturnShouldBeLastStatement;
                }
            }
        }

        return CannotExtractReason.None;
    }

    // Basic check making sure the start of the expression isn't unsupported
    // An improvement would be to check if there is an enclosing IF/WHILE loop using a walker
    // this is fail in cases where there is a statement selected first and then an non-enclosed break/continue/yield.
    private static _checkUnsupportedExpressions(
        parentNode: ParseNode,
        extractedNodes: ParseNodeArray,
        selectionRange: TextRange,
        isExpression: boolean
    ): CannotExtractReason {
        if (extractedNodes.length === 0 || extractedNodes[0] === undefined) {
            return CannotExtractReason.InvalidTargetSelected;
        }
        const breakAndContinueChecker = new BreakAndContinueEnclosedInLoop(selectionRange);
        breakAndContinueChecker.check(parentNode);

        if (breakAndContinueChecker.hasNonEnclosedContinue) {
            return CannotExtractReason.ContainsContinueWithoutLoop;
        }

        if (breakAndContinueChecker.hasNonEnclosedBreak) {
            return CannotExtractReason.ContainsBreakWithoutLoop;
        }

        // Limit extraction to just a right expression or full statements not both.
        // eg. x = [|1 + 3|] ok
        //
        //     x = [|1 + 3  error
        //     y = 2|]
        if (!isExpression) {
            const hasExpression = extractedNodes.some((node) => {
                if (node) {
                    // ignore sub expressions if the parent node is already in our list
                    // example "if statements currently add test expressions and statements"
                    const isChildNode = extractedNodes.find((n) => n && n.id === node.parent?.id);
                    if (!isChildNode) {
                        return this._isExpression(node);
                    }
                    return false;
                }
            });

            const hasArgument = extractedNodes.some((node) => node && node.nodeType === ParseNodeType.Argument);
            if (hasExpression || hasArgument) {
                return CannotExtractReason.InvalidExpressionAndStatementSelected;
            }
        }

        // Don't allow extracting a single variable name or function call name
        const leafNode = extractedNodes.length === 1 && extractedNodes[0].nodeType === ParseNodeType.Name;
        if (leafNode) {
            return CannotExtractReason.InvalidTargetSelected;
        }

        const yieldFinder = new YieldFinder();
        const containsYield = extractedNodes.some((node) => node && yieldFinder.checkContainsYield(node));
        if (containsYield) {
            return CannotExtractReason.ContainsYieldExpression;
        }

        const orphanedIfElse = extractedNodes.some(
            (node) =>
                node?.nodeType === ParseNodeType.If &&
                node.parent?.nodeType === ParseNodeType.If &&
                !selectionContainsNode(selectionRange, node.parent)
        );
        if (orphanedIfElse) {
            return CannotExtractReason.ContainsPartialIfElseStatement;
        }
        return CannotExtractReason.None;
    }

    private static _extractMethodGenerator(
        parameterSymbols: string[],
        outputSymbols: string[],
        selectionInfo: SelectionInfo,
        parseResults: ParseResults,
        evaluator: TypeEvaluator,
        filepath: string
    ): FileEditAction[] {
        if (
            selectionInfo.parentNode === undefined ||
            selectionInfo.bodyNodes === undefined ||
            selectionInfo.range === undefined
        ) {
            return [];
        }

        let insertFuncAheadOfSelection = false;
        const outputLines = parseResults.tokenizerOutput.lines;
        let indentionOffset = 0;
        // default new function insertion point for non-function enclosed extractions
        let newFuncInsertionPosition = convertOffsetToPosition(TextRange.getEnd(selectionInfo.parentNode), outputLines);
        newFuncInsertionPosition.character += 1;

        const funcInfo = this._getEnclosingFunctionInfo(selectionInfo, evaluator, outputLines);
        if (funcInfo && funcInfo.functionTypeResult) {
            const parameters = funcInfo.functionTypeResult.functionType.details.parameters;
            if (
                (funcInfo.isClassMethod || funcInfo.isBoundToClass) &&
                !funcInfo.isStaticMethod &&
                parameters.length > 0 &&
                parameters[0].name !== undefined
            ) {
                // add self or cls to the front of our parameters array
                if (!parameterSymbols.find((param) => param === parameters[0].name)) {
                    parameterSymbols.unshift(parameters[0].name);
                }
            }

            indentionOffset = funcInfo.indentionOffset;
            newFuncInsertionPosition = funcInfo.insertPosition;
        } else {
            // No enclosed function found, therefore extracting at module scope, so new extracted function needs to go ahead of calling code,
            // but to also handle nested scopes like multiple for statements we need to find the moduleNode and
            // not just the parentNode
            insertFuncAheadOfSelection = true;
            const moduleNode =
                selectionInfo.parentNode.nodeType === ParseNodeType.Module
                    ? selectionInfo.parentNode
                    : ParseTreeUtils.getEnclosingClassOrModule(selectionInfo.parentNode);

            if (moduleNode?.nodeType === ParseNodeType.Module && selectionInfo?.range) {
                const selectionOffset = selectionInfo.range.start;
                const enclosingStatement = moduleNode?.statements.find(
                    (statement) => statement.start <= selectionOffset && TextRange.getEnd(statement) >= selectionOffset
                );

                if (enclosingStatement) {
                    // 1 character ahead of the statement that contains our extraction selection
                    // ie. 'a = |1 + 3|'  position at x here -> 'xa = |1 + 3|'
                    newFuncInsertionPosition = convertOffsetToPosition(enclosingStatement.start, outputLines);
                }
            }
        }

        const baseNewName = funcInfo && funcInfo.className ? 'new_method' : 'new_func';
        const newFuncName = generateUniqueNameInClassOrModule(baseNewName, selectionInfo.parentNode);

        const methodBodyStr = ExtractMethodProvider._buildMethodBody(
            selectionInfo,
            parseResults,
            outputSymbols,
            indentionOffset
        );

        const functionDef = this._buildFunctionDefinition(
            newFuncName,
            parameterSymbols.join(', '),
            methodBodyStr,
            funcInfo,
            indentionOffset
        );

        let appendNewline = insertFuncAheadOfSelection ? '' : '\n\n';
        const newFuncAppendEdit = {
            filePath: filepath,
            range: { start: newFuncInsertionPosition, end: newFuncInsertionPosition },
            replacementText: appendNewline + functionDef,
        };

        const callFunctionString = this._buildCallDefinition(
            newFuncName,
            parameterSymbols,
            outputSymbols,
            funcInfo,
            selectionInfo.bodyNodes
        );

        // replace selected text with new function call
        // This edit is a replacement of the original selection
        appendNewline = parseResults.text.substr(TextRange.getEnd(selectionInfo.range) - 1, 1) === '\n' ? '\n' : '';
        const callReplacementEdit = {
            filePath: filepath,
            range: convertOffsetsToRange(selectionInfo.range.start, TextRange.getEnd(selectionInfo.range), outputLines),
            replacementText: callFunctionString + appendNewline,
        };

        // Edits are applied in reverse order, so we append first so that the
        // replacement of the selection doesn't interfere with our calculated offsets
        const editActions: FileEditAction[] = [];
        if (insertFuncAheadOfSelection) {
            newFuncAppendEdit.replacementText += '\n\n';
            editActions.push(newFuncAppendEdit);
            editActions.push(callReplacementEdit);
        } else {
            editActions.push(callReplacementEdit);
            editActions.push(newFuncAppendEdit);
        }
        return editActions;
    }

    private static _getEnclosingFunctionInfo(
        selectionInfo: SelectionInfo,
        evaluator: TypeEvaluator,
        outputLines: TextRangeCollection<TextRange>
    ): FunctionInfo | undefined {
        if (selectionInfo.parentNode === undefined) {
            return;
        }

        const enclosingFunctionNode = ParseTreeUtils.getEnclosingFunction(selectionInfo.parentNode);
        if (enclosingFunctionNode === undefined) {
            return;
        }

        const insertPosition = convertOffsetToPosition(TextRange.getEnd(enclosingFunctionNode), outputLines);
        insertPosition.character += 1;

        const funcInfo: FunctionInfo = {
            isStaticMethod: false,
            isClassMethod: false,
            isBoundToClass: false,
            node: enclosingFunctionNode,
            indentionOffset: convertOffsetToPosition(enclosingFunctionNode.start, outputLines).character,
            insertPosition: insertPosition,
        };

        const functionTypeResult = evaluator.getTypeOfFunction(enclosingFunctionNode);
        if (functionTypeResult) {
            funcInfo.functionTypeResult = functionTypeResult;

            // Check for function decorators
            funcInfo.isStaticMethod = FunctionType.isStaticMethod(functionTypeResult.functionType);
            funcInfo.isClassMethod = FunctionType.isClassMethod(functionTypeResult.functionType);

            const classOrModule = ParseTreeUtils.getEnclosingClassOrModule(selectionInfo.parentNode);
            if (classOrModule?.nodeType === ParseNodeType.Class) {
                funcInfo.className = classOrModule.name.value;
                funcInfo.isBoundToClass = true;
            }
        }

        return funcInfo;
    }

    private static _buildMethodBody(
        selectionInfo: SelectionInfo,
        parseResults: ParseResults,
        outputSymbols: string[],
        indentionOffset: number
    ) {
        if (selectionInfo.bodyNodes === undefined || selectionInfo.range === undefined) {
            return [];
        }

        const methodBodyStr = this._convertNodesToString(
            selectionInfo.bodyNodes,
            parseResults,
            selectionInfo.range,
            indentionOffset
        );

        const indention = ' '.repeat(indentionOffset + 4);
        // add return statement to new function definition
        if (selectionInfo.isExpression) {
            methodBodyStr[0] = indention + 'return ' + methodBodyStr[0];
        } else if (outputSymbols.length > 0) {
            const returnStr = indention + 'return ' + outputSymbols.join(',');
            methodBodyStr.push(returnStr);
        }

        return methodBodyStr;
    }

    // Is any node not a full statement but just a right hand expression ie. 1 + 2
    // todo: I think this needs to be refined to cover more edge cases
    private static _isExpression(node: ParseNode | undefined): boolean {
        if (
            // If we are an left nameNode in an assignment or call,or we are not an expression
            // ie. |print|("hello") or  |a| = 1 + 2
            (node?.parent?.nodeType === ParseNodeType.Assignment ||
                node?.parent?.nodeType === ParseNodeType.AugmentedAssignment ||
                node?.parent?.nodeType === ParseNodeType.Call) &&
            node.parent.leftExpression.id === node.id
        ) {
            return false;
        }

        const isExpression = node && isExpressionNode(node);
        return isExpression ?? false;
    }

    private static _buildCallDefinition(
        methodName: string,
        parametersStr: string[],
        outputSymbols: string[],
        enclosingFunc: FunctionInfo | undefined,
        bodyNodes: ParseNodeArray
    ): string {
        const isCoroutine = false; // todo calc
        let callStr = '';

        if (outputSymbols.length > 0) {
            callStr += outputSymbols.join(', ');
            callStr += ' = ';
        }

        if (isCoroutine) {
            callStr += 'await ';
        }

        if (enclosingFunc) {
            if (enclosingFunc.isStaticMethod && enclosingFunc.className !== undefined) {
                callStr += `${enclosingFunc.className}.${methodName}`;
            } else if ((enclosingFunc.isClassMethod || enclosingFunc.isBoundToClass) && parametersStr.length >= 1) {
                const classNameOrCls = parametersStr.shift();
                callStr += `${classNameOrCls}.${methodName}`;
            } else {
                callStr += methodName;
            }
        } else {
            callStr += methodName;
        }

        callStr += '(';
        callStr += parametersStr.join(', ');
        callStr += ')';

        // Handle extracting a return statement
        const returnFinder = new ReturnFinder();
        const hasReturnStmt = bodyNodes.some((node) => node && returnFinder.checkContainsReturn(node));
        if (hasReturnStmt) {
            callStr = 'return ' + callStr;
        }

        return callStr;
    }

    private static _buildFunctionDefinition(
        funcName: string,
        paramStr: string,
        bodyStr: string[],
        enclosingFunc: FunctionInfo | undefined,
        indentionOffset: number
    ): string {
        let decorator;
        if (enclosingFunc) {
            if (enclosingFunc.isStaticMethod) {
                decorator = '@staticmethod';
            } else if (enclosingFunc.isClassMethod) {
                decorator = '@classmethod';
            }
        }

        const functionIndention = ' '.repeat(indentionOffset);
        let funcStr = '';
        if (decorator) {
            funcStr += `${functionIndention}${decorator}\n`;
        }

        funcStr += `${functionIndention}def ${funcName}`;

        if (paramStr.length > 0) {
            funcStr += `(${paramStr}):\n`;
        } else {
            funcStr += `():\n`;
        }

        funcStr += bodyStr.join('\n');

        return funcStr.trimEnd();
    }

    private static _findNodesInRange(node: ParseNode, range: TextRange): ParseNodeArray {
        if (node.start > TextRange.getEnd(range) || TextRange.getEnd(node) < range.start) {
            return [];
        }

        const bodyNodes: ParseNodeArray = [];

        // The range is found within this node. See if we can localize it
        // further by checking its children.
        const parseTreeWalker = new ParseTreeWalker();
        const children = parseTreeWalker.visitNode(node);

        // node in range
        const isInRange = node.start >= range.start && TextRange.getEnd(node) <= TextRange.getEnd(range);
        if (isInRange) {
            bodyNodes.push(node);
            if (
                children.length === 0 ||
                isExpressionNode(node) ||
                node.nodeType === ParseNodeType.StatementList ||
                node.nodeType === ParseNodeType.Argument // don't allow child nodes of arguments to be added individually
            ) {
                return bodyNodes;
            }
        }

        for (const child of children) {
            if (child) {
                const containingChildren = this._findNodesInRange(child, range);
                containingChildren.forEach((child) => {
                    bodyNodes.push(child);
                });
            }
        }

        return bodyNodes;
    }

    private static _convertNodesToString(
        nodes: ParseNodeArray,
        parseResults: ParseResults,
        range: TextRange,
        indentionOffset: number
    ): string[] {
        const bodyLines: string[] = [];
        let curOffset = TextRange.getEnd(range);
        let preOffset = curOffset;
        let curPos = convertOffsetToPosition(curOffset, parseResults.tokenizerOutput.lines);
        let prePos = curPos;

        const firstLineIndent = convertOffsetToPosition(range.start, parseResults.tokenizerOutput.lines).character;

        // Walk backwards thur the nodes because we can't trust a node end as being a full line because it wont include comments,
        // so instead we copy all the way back to the previous offset which was a node's start.
        const reverseNodes = nodes.reverse().forEach((node) => {
            if (!node) {
                return;
            }

            curOffset = node.start;
            if (!TextRange.contains(range, node.start)) {
                curOffset = range.start;
            }

            // Make sure nodes like Suites, which include multiple statements don't duplicate previous
            // written strings
            curPos = convertOffsetToPosition(curOffset, parseResults.tokenizerOutput.lines);
            const curLength = curOffset + node.length > preOffset ? preOffset - curOffset : node.length;
            const nodeStr = parseResults.text.substr(curOffset, curLength);
            const nodeAsCodeLines = formatCode(nodeStr, node);

            // Capture any strings after the current node back to the previous node
            // in order to grab comments
            const postNodeStartOffset = TextRange.getEnd(node);
            const postNodeLength = preOffset - postNodeStartOffset;
            if (postNodeLength > 0) {
                const postNodeStr = parseResults.text.substr(postNodeStartOffset, postNodeLength);
                const postNodeStrings = formatCode(postNodeStr, undefined);
                if (bodyLines.length === 0) {
                    bodyLines.push(...postNodeStrings);
                } else {
                    bodyLines[bodyLines.length - 1] = postNodeStrings.join() + bodyLines[bodyLines.length - 1];
                }
            }

            if (curPos.line !== prePos.line) {
                // Format previous line
                const rawLineRange = parseResults.tokenizerOutput.lines.getItemAt(prePos.line);
                const rawLine = parseResults.text.substr(rawLineRange.start, rawLineRange.length);
                const indent = rawLine.indexOf(rawLine.trimStart());

                if (indent >= firstLineIndent) {
                    const newIndent = indent - firstLineIndent + 4 + indentionOffset;
                    let line = bodyLines[bodyLines.length - 1];
                    line = !line ? line : line.trimStart();
                    bodyLines[bodyLines.length - 1] = ' '.repeat(newIndent) + line;
                }

                bodyLines.push(...nodeAsCodeLines.reverse());
            } else {
                if (bodyLines.length === 0) {
                    bodyLines.push(...nodeAsCodeLines.reverse());
                } else {
                    bodyLines[bodyLines.length - 1] = nodeAsCodeLines.join() + bodyLines[bodyLines.length - 1];
                }
            }

            preOffset = curOffset;
            prePos = curPos;
        });

        // Format last line
        const rawLineRange = parseResults.tokenizerOutput.lines.getItemAt(curPos.line);
        const rawLine = parseResults.text.substr(rawLineRange.start, rawLineRange.length);
        const indent = rawLine.indexOf(rawLine.trimStart());

        if (indent >= firstLineIndent) {
            const newIndent = indent - firstLineIndent + 4 + indentionOffset;
            let line = bodyLines[bodyLines.length - 1];
            line = !line ? line : line.trimStart();
            bodyLines[bodyLines.length - 1] = ' '.repeat(newIndent) + line;
        }

        return bodyLines.reverse();
    }

    private static _findSignatureSymbols(
        symbolReferences: Map<string, ReferencesResult>,
        selRange: TextRange,
        parseResults: ParseResults,
        token: CancellationToken
    ): string[] {
        const parameters = new Map<string, string>();

        symbolReferences.forEach((refResults, symbolName) => {
            refResults.locations.forEach((docRange) => {
                if (parameters.has(symbolName)) {
                    return;
                }

                if (token.isCancellationRequested) {
                    return;
                }

                const readLocation = convertRangeToTextRange(docRange.range, parseResults.tokenizerOutput.lines);
                const isInSelection = TextRange.contains(selRange, readLocation!.start);
                if (isInSelection) {
                    const isDeclaredInsideSelectionBeforeRead = refResults.declarations.some(
                        (decl, _) =>
                            TextRange.contains(selRange, decl.node.start) && decl.node.start < readLocation!.start
                    );

                    if (!isDeclaredInsideSelectionBeforeRead) {
                        const isDeclaredBeforeSelection = refResults.declarations.some(
                            (decl, _) => decl.node.start < selRange!.start
                        );

                        if (isDeclaredBeforeSelection) {
                            parameters.set(symbolName, symbolName);
                        }
                    }
                }
            });
        });

        return Array.from(parameters.keys());
    }

    private static _findOutputSymbols(
        symbolReferences: Map<string, ReferencesResult>,
        selRange: TextRange,
        parseResults: ParseResults,
        token: CancellationToken
    ): string[] {
        const symbolsWrittenInSelection = findSymbolsInSelection(symbolReferences, token, selRange);

        const selectionEndPosition = convertOffsetToPosition(
            TextRange.getEnd(selRange),
            parseResults.tokenizerOutput.lines
        );

        // Search the symbols written inside the selection for reads after the selection,
        // but also check for writes after the selection.
        const outputSymbol = new Map<string, string>();
        symbolReferences.forEach((refResults, symbolName) => {
            if (!symbolsWrittenInSelection.has(symbolName)) {
                return;
            }

            const readsAfterSelection = refResults.locations.filter(
                (docRange) => comparePositions(docRange.range.start, selectionEndPosition) > 0
            );

            const declarationsAfterSelection = refResults.declarations.filter(
                (decl) => decl.node.start > TextRange.getEnd(selRange)
            );

            readsAfterSelection.forEach((docRange) => {
                if (token.isCancellationRequested) {
                    return;
                }

                if (outputSymbol.has(symbolName)) {
                    return;
                }

                const readLocation = convertRangeToTextRange(docRange.range, parseResults.tokenizerOutput.lines);
                if (readLocation === undefined) {
                    return;
                }

                // Note all declaration locations are also refResult locations, so skip checking those reads
                const isDeclaration = declarationsAfterSelection.find((decl) => readLocation.start === decl.node.start);
                if (isDeclaration) {
                    return;
                }

                const isWrittenBeforeReadAfterSelection = declarationsAfterSelection.some((decl) => {
                    const writePosition = convertOffsetToPosition(decl.node.start, parseResults.tokenizerOutput.lines);
                    const readPosition = convertOffsetToPosition(
                        readLocation.start,
                        parseResults.tokenizerOutput.lines
                    );

                    // We need to compare line numbers instead of offsets because in the case
                    // (x = x) the read is before the write but the offset of the read is greater than the offset of the write
                    let isWriteBeforeRead = writePosition.line < readPosition.line;
                    if (writePosition.line === readPosition.line) {
                        isWriteBeforeRead = writePosition.character > readPosition.character;
                    }

                    return isWriteBeforeRead;
                });

                if (!isWrittenBeforeReadAfterSelection) {
                    outputSymbol.set(symbolName, symbolName);
                }
            });
        });

        return Array.from(outputSymbol.keys());
    }

    static verifyAndAdjustSelectionNodes(parseResults: ParseResults, selectionRange: TextRange): TextRange | undefined {
        const moduleNode = parseResults.parseTree as ParseNode;
        let adjRange = adjustRangeForWhitespace(selectionRange, parseResults.text);
        let startNode = findNodeByOffset(moduleNode, adjRange.start);
        if (!startNode) {
            return;
        }

        // See if we need to shrink the startNode. ie. mistaken extra binary operator like '+'
        if (!this._isValidExtractionNode(startNode)) {
            startNode = this._findNextClosestNode(
                StepDirection.Forward,
                moduleNode,
                startNode,
                adjRange.start,
                parseResults.text
            );

            if (startNode && startNode.start > adjRange.start) {
                const diff = adjRange.start - startNode.start;
                adjRange = TextRange.create(startNode.start, adjRange.length + diff);
            }
        }

        if (!startNode) {
            return;
        }

        // Fix for only selecting the test expression of a startNode while or if statement
        const startNodeContained = selectionContainsNode(selectionRange, startNode);
        if (!startNodeContained) {
            return;
        }

        let endOffset = TextRange.getEnd(adjRange);
        let endNode = findNodeByOffset(moduleNode, endOffset);
        if (!endNode) {
            return;
        }

        // Fix for only selecting the test expression of a endNode while or if statement
        // When including comments in our selection our end node will be a parent node that starts
        // before the selection so don't error in this case.
        const endNodeContained = selectionContainsNode(selectionRange, endNode);
        if (TextRange.contains(selectionRange, endNode.start) && !endNodeContained) {
            return;
        }

        let parentNode = startNode;
        while (TextRange.getEnd(parentNode) < TextRange.getEnd(endNode)) {
            if (parentNode.parent === undefined) {
                break;
            }
            parentNode = parentNode.parent;
        }

        // Expand selection endpoint to capture common parentNode and to prevent partial selection of if statements
        if (!selectionContainsNode(selectionRange, parentNode)) {
            endNode = parentNode;
            endOffset = TextRange.getEnd(endNode);
        }

        // Check for crossing function or Class boundaries
        const startFuncOrClassScopeNode = ParseTreeUtils.getTypeVarScopeNode(startNode);
        const endFuncOrClassScopeNode = ParseTreeUtils.getTypeVarScopeNode(endNode);

        const funcOrClassMismatch =
            startFuncOrClassScopeNode &&
            endFuncOrClassScopeNode &&
            startFuncOrClassScopeNode.id !== endFuncOrClassScopeNode.id;
        if (funcOrClassMismatch) {
            return;
        }

        const startNodeSuiteOrModule =
            startNode.nodeType === ParseNodeType.Suite || startNode.nodeType === ParseNodeType.Module
                ? startNode
                : getEnclosingSuiteOrModule(startNode, /*stopAtFunction*/ true, /*stopAtLambda*/ false);

        // See if we need to expand or shrink the endNode. ie. mistaken extra binary operator like '+'
        if (!this._isValidExtractionNode(endNode)) {
            // Shrink
            endNode = this._findNextClosestNode(
                StepDirection.Backward,
                moduleNode,
                endNode,
                endOffset,
                parseResults.text
            );

            if (endNode) {
                adjRange = TextRange.fromBounds(startNode.start, endNode.start + endNode.length);
            }
        } else {
            // To capture the comments at an end of line we find the line range and extend the selection to that.
            // When the user is including comments at the end of a line the endNode from findNodeByOffset() won't be found on that line but
            // as a parent node of type Suite or Module
            if (
                startNodeSuiteOrModule &&
                (endNode.nodeType === ParseNodeType.Suite || endNode.nodeType === ParseNodeType.Module)
            ) {
                const firstStatementAfterRange = startNodeSuiteOrModule.statements.find(
                    (s) => s.start > TextRange.getEnd(adjRange)
                );

                if (firstStatementAfterRange !== undefined) {
                    const position = convertOffsetToPosition(
                        TextRange.getEnd(adjRange),
                        parseResults.tokenizerOutput.lines
                    );
                    const line = parseResults.tokenizerOutput.lines.getItemAt(position.line);
                    endOffset = line.start + line.length - 1; //minus one to not include newline
                }
                endNode = undefined;
            }

            adjRange = TextRange.create(adjRange.start, endOffset - adjRange.start);
            adjRange = adjustRangeForWhitespace(adjRange, parseResults.text);
        }

        // Prevent invalid partial if selections
        if (endNode && startNode.start > endNode?.start) {
            return;
        }

        return adjRange;
    }

    // See if we can get to a "better" node by backing up a few columns.
    // A "better" node is defined as one that is a valid extraction node on the same line
    private static _findNextClosestNode(
        dir: StepDirection,
        root: ParseNode,
        node: ParseNode | undefined,
        offset: number,
        fileContents: string
    ): ParseNode | undefined {
        const initialNode = node;
        const stopChar = StepDirection.Backward ? '(' : ')';

        let curOffset = offset;
        while (curOffset >= 0 && curOffset < fileContents.length - 1) {
            if (dir === StepDirection.Backward) curOffset--;
            else curOffset++;

            // Stop scanning backward if we hit certain stop characters.
            const curChar = fileContents.substr(curOffset, 1);
            if (curChar === stopChar || curChar === '\n') {
                break;
            }

            const curNode = findNodeByOffset(root, curOffset);
            if (curNode && curNode !== initialNode && this._isValidExtractionNode(curNode)) {
                node = curNode;
                break;
            }
        }

        return node;
    }

    private static _findParentForRange(rootNode: ParseNode, range: TextRange): SuiteNode | ModuleNode | undefined {
        const startNode = findNodeByOffset(rootNode, range.start);
        if (startNode === undefined) {
            return;
        }

        if (!this._isValidExtractionNode(startNode)) {
            return;
        }

        const endOffset = TextRange.getEnd(range);
        const endNode = findNodeByOffset(rootNode, endOffset);
        if (endNode === undefined) {
            return;
        }

        const startNodeParent = getEnclosingSuiteOrModule(startNode, /*stopAtFunction*/ true, /*stopAtLambda*/ false);
        const endNodeParent = getEnclosingSuiteOrModule(startNode, /*stopAtFunction*/ true, /*stopAtLambda*/ false);

        if (startNodeParent?.id !== endNodeParent?.id) {
            return;
        }

        return startNodeParent;
    }

    private static _isValidExtractionNode(node: ParseNode): boolean {
        return !(
            node.nodeType === ParseNodeType.BinaryOperation ||
            (node.nodeType === ParseNodeType.Constant &&
                node.constType !== KeywordType.None &&
                node.constType !== KeywordType.True &&
                node.constType !== KeywordType.False)
        );
    }

    private static _expressionNodesToString(
        bodyNodes: ParseNodeArray,
        parseResults: ParseResults,
        adjRange: TextRange
    ) {
        return this._convertNodesToString(bodyNodes, parseResults, adjRange, 0).join('');
    }
}

function findSymbolsInSelection(
    symbolReferences: Map<string, ReferencesResult>,
    token: CancellationToken,
    selRange: TextRange
) {
    const symbolsWrittenInSelection = new Map<string, string>();

    symbolReferences.forEach((refResults, symbolName) => {
        refResults.declarations.forEach((decl, _) => {
            if (symbolsWrittenInSelection.has(symbolName)) {
                return;
            }

            if (token.isCancellationRequested) {
                return;
            }

            const isInSelection = TextRange.contains(selRange, decl.node.start);
            if (isInSelection) {
                symbolsWrittenInSelection.set(symbolName, symbolName);
            }
        });
    });
    return symbolsWrittenInSelection;
}

function adjustRangeForWhitespace(selRange: TextRange, fileContents: string): TextRange {
    let offset = selRange.start;

    while (offset < fileContents.length) {
        const curChar = fileContents.substr(offset, 1);
        if (curChar !== ' ') {
            break;
        }

        offset++;
    }
    const start = offset;
    offset = TextRange.getEnd(selRange) - 1;
    while (offset > 0) {
        const curChar = fileContents.substr(offset, 1);
        if (curChar !== ' ') {
            offset++;
            break;
        }

        offset--;
    }

    return TextRange.fromBounds(start, offset);
}

function selectionContainsNode(range: TextRange, node: ParseNode) {
    return range.start <= node.start && TextRange.getEnd(node) <= TextRange.getEnd(range);
}

function generateUniqueNameInClassOrModule(basename: string, parentNode: ParseNode) {
    let uniqueName = basename;
    let i = 1;
    const classOrModule =
        parentNode.nodeType === ParseNodeType.Module ? parentNode : getEnclosingClassOrModule(parentNode);
    if (classOrModule !== undefined) {
        const scope = AnalyzerNodeInfo.getScope(classOrModule);
        while (scope?.lookUpSymbol(uniqueName) !== undefined) {
            uniqueName = basename + i++;
        }
    }

    return uniqueName;
}

function generateUniqueNameInFunction(basename: string, enclosedFunctionNode: ParseNode) {
    let uniqueName = basename;
    let i = 1;

    if (enclosedFunctionNode !== undefined) {
        const scope = AnalyzerNodeInfo.getScope(enclosedFunctionNode);
        while (scope?.lookUpSymbol(uniqueName) !== undefined) {
            uniqueName = basename + i++;
        }
    }

    return uniqueName;
}

class BreakAndContinueEnclosedInLoop extends ParseTreeWalker {
    public hasNonEnclosedContinue = false;
    public hasNonEnclosedBreak = false;
    private _loopCount = 0;
    private _loopTypes = [ParseNodeType.While, ParseNodeType.For];

    constructor(private _selectionRange: TextRange) {
        super();
    }

    check(node: ParseNode) {
        this.walk(node);
    }

    visitContinue(node: ContinueNode): boolean {
        if (selectionContainsNode(this._selectionRange, node)) {
            this.hasNonEnclosedContinue = !getParentOfTypeInSelection(node, this._loopTypes, this._selectionRange);
        }
        return false;
    }

    visitBreak(node: BreakNode): boolean {
        if (selectionContainsNode(this._selectionRange, node)) {
            this.hasNonEnclosedBreak = !getParentOfTypeInSelection(node, this._loopTypes, this._selectionRange);
        }
        return false;
    }
}

function getParentOfTypeInSelection(node: ParseNode, typesToMatch: ParseNodeType[], selection: TextRange) {
    let curNode: ParseNode | undefined = node;

    while (curNode !== undefined && selection && selectionContainsNode(selection, curNode)) {
        if (typesToMatch.some((type) => type === curNode!.nodeType)) {
            return curNode;
        }
        curNode = curNode.parent;
    }

    return undefined;
}
