/*
 * dumpFileDebugInfoCommand.ts
 * Copyright (c) Microsoft Corporation.
 *
 * Dump various token/node/type info
 */

import { CancellationToken, ExecuteCommandParams } from 'vscode-languageserver';

import { ParseTreeWalker } from 'pyright-internal/analyzer/parseTreeWalker';
import { throwIfCancellationRequested } from 'pyright-internal/common/cancellationUtils';
import { convertOffsetsToRange } from 'pyright-internal/common/positionUtils';
import { TextRange } from 'pyright-internal/common/textRange';
import { TextRangeCollection } from 'pyright-internal/common/textRangeCollection';
import { LanguageServerInterface } from 'pyright-internal/languageServerBase';
import {
    ArgumentCategory,
    ArgumentNode,
    AssertNode,
    AssignmentExpressionNode,
    AssignmentNode,
    AugmentedAssignmentNode,
    AwaitNode,
    BinaryOperationNode,
    BreakNode,
    CallNode,
    ClassNode,
    ConstantNode,
    ContinueNode,
    DecoratorNode,
    DelNode,
    DictionaryExpandEntryNode,
    DictionaryKeyEntryNode,
    DictionaryNode,
    EllipsisNode,
    ErrorExpressionCategory,
    ErrorNode,
    ExceptNode,
    FormatStringNode,
    ForNode,
    FunctionAnnotationNode,
    FunctionNode,
    GlobalNode,
    IfNode,
    ImportAsNode,
    ImportFromAsNode,
    ImportFromNode,
    ImportNode,
    IndexNode,
    LambdaNode,
    ListComprehensionForNode,
    ListComprehensionIfNode,
    ListComprehensionNode,
    ListNode,
    MemberAccessNode,
    ModuleNameNode,
    ModuleNode,
    NameNode,
    NonlocalNode,
    NumberNode,
    ParameterCategory,
    ParameterNode,
    ParseNode,
    ParseNodeType,
    PassNode,
    RaiseNode,
    ReturnNode,
    SetNode,
    SliceNode,
    StatementListNode,
    StringListNode,
    StringNode,
    SuiteNode,
    TernaryNode,
    TryNode,
    TupleNode,
    TypeAnnotationNode,
    UnaryOperationNode,
    UnpackNode,
    WhileNode,
    WithItemNode,
    WithNode,
    YieldFromNode,
    YieldNode,
} from 'pyright-internal/parser/parseNodes';
import {
    KeywordType,
    NewLineType,
    OperatorType,
    StringTokenFlags,
    Token,
    TokenType,
} from 'pyright-internal/parser/tokenizerTypes';

import { ServerCommand } from './commandController';

export class DumpFileDebugInfoCommand implements ServerCommand {
    constructor(private _ls: LanguageServerInterface) {}

    async execute(params: ExecuteCommandParams, token: CancellationToken): Promise<any> {
        throwIfCancellationRequested(token);

        if (params.arguments?.length !== 2) {
            return [];
        }

        const filePath = params.arguments[0];
        const kind = params.arguments[1];

        const workspace = await this._ls.getWorkspaceForFile(filePath);
        const parseResults = workspace.serviceInstance.getParseResult(filePath);
        if (!parseResults) {
            return [];
        }

        this._ls.console.info(`* Dump debug info for '${filePath}'`);

        switch (kind) {
            case 'tokens': {
                this._ls.console.info(`* Token info (${parseResults.tokenizerOutput.tokens.count} tokens)`);

                for (let i = 0; i < parseResults.tokenizerOutput.tokens.count; i++) {
                    const token = parseResults.tokenizerOutput.tokens.getItemAt(i);
                    this._ls.console.info(`[${i}] ${getTokenString(token, parseResults.tokenizerOutput.lines)}`);
                }
                break;
            }
            case 'nodes': {
                this._ls.console.info(`* Node info`);
                const dumper = new TreeDumper(parseResults.tokenizerOutput.lines);
                dumper.walk(parseResults.parseTree);

                this._ls.console.info(dumper.output);
                break;
            }
        }
    }
}

class TreeDumper extends ParseTreeWalker {
    private _indentation = '';
    private _output = '';

    constructor(private _lines: TextRangeCollection<TextRange>) {
        super();
    }

    get output(): string {
        return this._output;
    }

    walk(node: ParseNode): void {
        const childrenToWalk = this.visitNode(node);
        if (childrenToWalk.length > 0) {
            this._indentation += '  ';
            this.walkMultiple(childrenToWalk);
            this._indentation = this._indentation.substr(0, this._indentation.length - 2);
        }
    }

    private _log(value: string) {
        this._output += `${this._indentation}${value}\r\n`;
    }

    private _getPrefix(node: ParseNode) {
        return `[${node.id}] (${getParseNodeTypeString(node.nodeType)}, p:${node.start} l:${
            node.length
        } [${getTextSpanString(node, this._lines)}])`;
    }

    visitArgument(node: ArgumentNode) {
        this._log(`${this._getPrefix(node)} ${getArgumentCategoryString(node.argumentCategory)}`);
        return true;
    }

    visitAssert(node: AssertNode) {
        this._log(`${this._getPrefix(node)}`);
        return true;
    }

    visitAssignment(node: AssignmentNode) {
        this._log(`${this._getPrefix(node)}`);
        return true;
    }

    visitAssignmentExpression(node: AssignmentExpressionNode) {
        this._log(`${this._getPrefix(node)}`);
        return true;
    }

    visitAugmentedAssignment(node: AugmentedAssignmentNode) {
        this._log(`${this._getPrefix(node)} ${getOperatorTypeString(node.operator)}`);
        return true;
    }

    visitAwait(node: AwaitNode) {
        this._log(`${this._getPrefix(node)}`);
        return true;
    }

    visitBinaryOperation(node: BinaryOperationNode) {
        this._log(
            `${this._getPrefix(node)} ${getTokenString(node.operatorToken, this._lines)} ${getOperatorTypeString(
                node.operator
            )}} parenthesized:(${node.parenthesized})`
        );
        return true;
    }

    visitBreak(node: BreakNode) {
        this._log(`${this._getPrefix(node)}`);
        return true;
    }

    visitCall(node: CallNode) {
        this._log(`${this._getPrefix(node)}`);
        return true;
    }

    visitClass(node: ClassNode) {
        this._log(`${this._getPrefix(node)}`);
        return true;
    }

    visitTernary(node: TernaryNode) {
        this._log(`${this._getPrefix(node)}`);
        return true;
    }

    visitContinue(node: ContinueNode) {
        this._log(`${this._getPrefix(node)}`);
        return true;
    }

    visitConstant(node: ConstantNode) {
        this._log(`${this._getPrefix(node)} ${getKeywordTypeString(node.constType)}`);
        return true;
    }

    visitDecorator(node: DecoratorNode) {
        this._log(`${this._getPrefix(node)}`);
        return true;
    }

    visitDel(node: DelNode) {
        this._log(`${this._getPrefix(node)}`);
        return true;
    }

    visitDictionary(node: DictionaryNode) {
        this._log(`${this._getPrefix(node)}`);
        return true;
    }

    visitDictionaryKeyEntry(node: DictionaryKeyEntryNode) {
        this._log(`${this._getPrefix(node)}`);
        return true;
    }

    visitDictionaryExpandEntry(node: DictionaryExpandEntryNode) {
        this._log(`${this._getPrefix(node)}`);
        return true;
    }

    visitError(node: ErrorNode) {
        this._log(`${this._getPrefix(node)} ${getErrorExpressionCategoryString(node.category)}`);
        return true;
    }

    visitEllipsis(node: EllipsisNode) {
        this._log(`${this._getPrefix(node)}`);
        return true;
    }

    visitIf(node: IfNode) {
        this._log(`${this._getPrefix(node)}`);
        return true;
    }

    visitImport(node: ImportNode) {
        this._log(`${this._getPrefix(node)}`);
        return true;
    }

    visitImportAs(node: ImportAsNode) {
        this._log(`${this._getPrefix(node)}`);
        return true;
    }

    visitImportFrom(node: ImportFromNode) {
        this._log(
            `${this._getPrefix(node)} wildcard import:(${node.isWildcardImport}) paren:(${
                node.usesParens
            }) wildcard token:(${
                node.wildcardToken ? getTokenString(node.wildcardToken, this._lines) : 'N/A'
            }) missing import keyword:(${node.missingImportKeyword})`
        );
        return true;
    }

    visitImportFromAs(node: ImportFromAsNode) {
        this._log(`${this._getPrefix(node)}`);
        return true;
    }

    visitIndex(node: IndexNode) {
        this._log(`${this._getPrefix(node)}`);
        return true;
    }

    visitExcept(node: ExceptNode) {
        this._log(`${this._getPrefix(node)}`);
        return true;
    }

    visitFor(node: ForNode) {
        this._log(`${this._getPrefix(node)} async:(${node.isAsync})`);
        return true;
    }

    visitFormatString(node: FormatStringNode) {
        this._log(
            `${this._getPrefix(node)} ${getTokenString(node.token, this._lines)} ${node.value} unescape errors:(${
                node.hasUnescapeErrors
            })`
        );
        return true;
    }

    visitFunction(node: FunctionNode) {
        this._log(`${this._getPrefix(node)} async:(${node.isAsync})`);
        return true;
    }

    visitFunctionAnnotation(node: FunctionAnnotationNode) {
        this._log(`${this._getPrefix(node)} ellipsis:(${node.isParamListEllipsis})`);
        return true;
    }

    visitGlobal(node: GlobalNode) {
        this._log(`${this._getPrefix(node)}`);
        return true;
    }

    visitLambda(node: LambdaNode) {
        this._log(`${this._getPrefix(node)}`);
        return true;
    }

    visitList(node: ListNode) {
        this._log(`${this._getPrefix(node)}`);
        return true;
    }

    visitListComprehension(node: ListComprehensionNode) {
        this._log(`${this._getPrefix(node)}`);
        return true;
    }

    visitListComprehensionFor(node: ListComprehensionForNode) {
        this._log(`${this._getPrefix(node)} async:(${node.isAsync})`);
        return true;
    }

    visitListComprehensionIf(node: ListComprehensionIfNode) {
        this._log(`${this._getPrefix(node)}`);
        return true;
    }

    visitMemberAccess(node: MemberAccessNode) {
        this._log(`${this._getPrefix(node)}`);
        return true;
    }

    visitModule(node: ModuleNode) {
        this._log(`${this._getPrefix(node)}`);
        return true;
    }

    visitModuleName(node: ModuleNameNode) {
        this._log(`${this._getPrefix(node)} leading dots:(${node.leadingDots}) trailing dot:(${node.hasTrailingDot})`);
        return true;
    }

    visitName(node: NameNode) {
        this._log(`${this._getPrefix(node)} ${getTokenString(node.token, this._lines)} ${node.value}`);
        return true;
    }

    visitNonlocal(node: NonlocalNode) {
        this._log(`${this._getPrefix(node)}`);
        return true;
    }

    visitNumber(node: NumberNode) {
        this._log(`${this._getPrefix(node)} ${node.value} int:(${node.isInteger}) imaginary:(${node.isImaginary})`);
        return true;
    }

    visitParameter(node: ParameterNode) {
        this._log(`${this._getPrefix(node)} ${getParameterCategoryString(node.category)}`);
        return true;
    }

    visitPass(node: PassNode) {
        this._log(`${this._getPrefix(node)}`);
        return true;
    }

    visitRaise(node: RaiseNode) {
        this._log(`${this._getPrefix(node)}`);
        return true;
    }

    visitReturn(node: ReturnNode) {
        this._log(`${this._getPrefix(node)}`);
        return true;
    }

    visitSet(node: SetNode) {
        this._log(`${this._getPrefix(node)}`);
        return true;
    }

    visitSlice(node: SliceNode) {
        this._log(`${this._getPrefix(node)}`);
        return true;
    }

    visitStatementList(node: StatementListNode) {
        this._log(`${this._getPrefix(node)}`);
        return true;
    }

    visitString(node: StringNode) {
        this._log(
            `${this._getPrefix(node)} ${getTokenString(node.token, this._lines)} ${node.value} unescape errors:(${
                node.hasUnescapeErrors
            })`
        );
        return true;
    }

    visitStringList(node: StringListNode) {
        this._log(`${this._getPrefix(node)}`);
        return true;
    }

    visitSuite(node: SuiteNode) {
        this._log(`${this._getPrefix(node)}`);
        return true;
    }

    visitTuple(node: TupleNode) {
        this._log(`${this._getPrefix(node)} paren:(${node.enclosedInParens})`);
        return true;
    }

    visitTry(node: TryNode) {
        this._log(`${this._getPrefix(node)}`);
        return true;
    }

    visitTypeAnnotation(node: TypeAnnotationNode) {
        this._log(`${this._getPrefix(node)}`);
        return true;
    }

    visitUnaryOperation(node: UnaryOperationNode) {
        this._log(
            `${this._getPrefix(node)} ${getTokenString(node.operatorToken, this._lines)} ${getOperatorTypeString(
                node.operator
            )}`
        );
        return true;
    }

    visitUnpack(node: UnpackNode) {
        this._log(`${this._getPrefix(node)}`);
        return true;
    }

    visitWhile(node: WhileNode) {
        this._log(`${this._getPrefix(node)}`);
        return true;
    }

    visitWith(node: WithNode) {
        this._log(`${this._getPrefix(node)} async:(${node.isAsync})`);
        return true;
    }

    visitWithItem(node: WithItemNode) {
        this._log(`${this._getPrefix(node)}`);
        return true;
    }

    visitYield(node: YieldNode) {
        this._log(`${this._getPrefix(node)}`);
        return true;
    }

    visitYieldFrom(node: YieldFromNode) {
        this._log(`${this._getPrefix(node)}`);
        return true;
    }
}

function getParameterCategoryString(type: ParameterCategory) {
    switch (type) {
        case ParameterCategory.Simple:
            return 'Simple';
        case ParameterCategory.VarArgList:
            return 'VarArgList';
        case ParameterCategory.VarArgDictionary:
            return 'VarArgDictionary';
    }
}

function getArgumentCategoryString(type: ArgumentCategory) {
    switch (type) {
        case ArgumentCategory.Simple:
            return 'Simple';
        case ArgumentCategory.UnpackedList:
            return 'UnpackedList';
        case ArgumentCategory.UnpackedDictionary:
            return 'UnpackedDictionary';
        default:
            return 'Unknown!!';
    }
}

function getParseNodeTypeString(type: ParseNodeType) {
    switch (type) {
        case ParseNodeType.Error:
            return 'Error';
        case ParseNodeType.Argument:
            return 'Argument';
        case ParseNodeType.Assert:
            return 'Assert';
        case ParseNodeType.Assignment:
            return 'Assignment';
        case ParseNodeType.AssignmentExpression:
            return 'AssignmentExpression';
        case ParseNodeType.AugmentedAssignment:
            return 'AugmentedAssignment';
        case ParseNodeType.Await:
            return 'Await';
        case ParseNodeType.BinaryOperation:
            return 'BinaryOperation';
        case ParseNodeType.Break:
            return 'Break';
        case ParseNodeType.Call:
            return 'Call';
        case ParseNodeType.Class:
            return 'Class';
        case ParseNodeType.Constant:
            return 'Constant';
        case ParseNodeType.Continue:
            return 'Continue';
        case ParseNodeType.Decorator:
            return 'Decorator';
        case ParseNodeType.Del:
            return 'Del';
        case ParseNodeType.Dictionary:
            return 'Dictionary';
        case ParseNodeType.DictionaryExpandEntry:
            return 'DictionaryExpandEntry';
        case ParseNodeType.DictionaryKeyEntry:
            return 'DictionaryKeyEntry';
        case ParseNodeType.Ellipsis:
            return 'Ellipsis';
        case ParseNodeType.If:
            return 'If';
        case ParseNodeType.Import:
            return 'Import';
        case ParseNodeType.ImportAs:
            return 'ImportAs';
        case ParseNodeType.ImportFrom:
            return 'ImportFrom';
        case ParseNodeType.ImportFromAs:
            return 'ImportFromAs';
        case ParseNodeType.Index:
            return 'Index';
        case ParseNodeType.Except:
            return 'Except';
        case ParseNodeType.For:
            return 'For';
        case ParseNodeType.FormatString:
            return 'FormatString';
        case ParseNodeType.Function:
            return 'Function';
        case ParseNodeType.Global:
            return 'Global';
        case ParseNodeType.Lambda:
            return 'Lambda';
        case ParseNodeType.List:
            return 'List';
        case ParseNodeType.ListComprehension:
            return 'ListComprehension';
        case ParseNodeType.ListComprehensionFor:
            return 'ListComprehensionFor';
        case ParseNodeType.ListComprehensionIf:
            return 'ListComprehensionIf';
        case ParseNodeType.MemberAccess:
            return 'MemberAccess';
        case ParseNodeType.Module:
            return 'Module';
        case ParseNodeType.ModuleName:
            return 'ModuleName';
        case ParseNodeType.Name:
            return 'Name';
        case ParseNodeType.Nonlocal:
            return 'Nonlocal';
        case ParseNodeType.Number:
            return 'Number';
        case ParseNodeType.Parameter:
            return 'Parameter';
        case ParseNodeType.Pass:
            return 'Pass';
        case ParseNodeType.Raise:
            return 'Raise';
        case ParseNodeType.Return:
            return 'Return';
        case ParseNodeType.Set:
            return 'Set';
        case ParseNodeType.Slice:
            return 'Slice';
        case ParseNodeType.StatementList:
            return 'StatementList';
        case ParseNodeType.StringList:
            return 'StringList';
        case ParseNodeType.String:
            return 'String';
        case ParseNodeType.Suite:
            return 'Suite';
        case ParseNodeType.Ternary:
            return 'Ternary';
        case ParseNodeType.Tuple:
            return 'Tuple';
        case ParseNodeType.Try:
            return 'Try';
        case ParseNodeType.TypeAnnotation:
            return 'TypeAnnotation';
        case ParseNodeType.UnaryOperation:
            return 'UnaryOperation';
        case ParseNodeType.Unpack:
            return 'Unpack';
        case ParseNodeType.While:
            return 'While';
        case ParseNodeType.With:
            return 'With';
        case ParseNodeType.WithItem:
            return 'WithItem';
        case ParseNodeType.Yield:
            return 'Yield';
        case ParseNodeType.YieldFrom:
            return 'YieldFrom';
        case ParseNodeType.FunctionAnnotation:
            return 'FunctionAnnotation';
        default:
            return 'Unknown!!';
    }
}

function getErrorExpressionCategoryString(type: ErrorExpressionCategory) {
    switch (type) {
        case ErrorExpressionCategory.MissingIn:
            return 'MissingIn';
        case ErrorExpressionCategory.MissingElse:
            return 'MissingElse';
        case ErrorExpressionCategory.MissingExpression:
            return 'MissingExpression';
        case ErrorExpressionCategory.MissingIndexOrSlice:
            return 'MissingIndexOrSlice';
        case ErrorExpressionCategory.MissingDecoratorCallName:
            return 'MissingDecoratorCallName';
        case ErrorExpressionCategory.MissingCallCloseParen:
            return 'MissingCallCloseParen';
        case ErrorExpressionCategory.MissingIndexCloseBracket:
            return 'MissingIndexCloseBracket';
        case ErrorExpressionCategory.MissingMemberAccessName:
            return 'MissingMemberAccessName';
        case ErrorExpressionCategory.MissingTupleCloseParen:
            return 'MissingTupleCloseParen';
        case ErrorExpressionCategory.MissingListCloseBracket:
            return 'MissingListCloseBracket';
        case ErrorExpressionCategory.MissingFunctionParameterList:
            return 'MissingFunctionParameterList';
        default:
            return 'Unknown!!';
    }
}

function getTokenString(token: Token, lines: TextRangeCollection<TextRange>) {
    let str = '(';
    str += getTokenTypeString(token.type);
    str += getNewLineInfo(token);
    str += getOperatorInfo(token);
    str += getKeywordInfo(token);
    str += getStringTokenFlags(token);
    str += `, ${getTextSpanString(token, lines)}`;
    str += ') ';
    str += JSON.stringify(token);

    return str;

    function getNewLineInfo(t: any) {
        return t.newLineType ? `, ${getNewLineTypeString(t.newLineType)}` : '';
    }

    function getOperatorInfo(t: any) {
        return t.operatorType ? `, ${getOperatorTypeString(t.operatorType)}` : '';
    }

    function getKeywordInfo(t: any) {
        return t.keywordType ? `, ${getKeywordTypeString(t.keywordType)}` : '';
    }

    function getStringTokenFlags(t: any) {
        return t.flags ? `, [${getStringTokenFlagsString(t.flags)}]` : '';
    }
}

function getTextSpanString(span: TextRange, lines: TextRangeCollection<TextRange>) {
    const range = convertOffsetsToRange(span.start, TextRange.getEnd(span), lines);
    return `(${range.start.line},${range.start.character})-(${range.end.line},${range.end.character})`;
}

function getTokenTypeString(type: TokenType) {
    switch (type) {
        case TokenType.Invalid:
            return 'Invalid';
        case TokenType.EndOfStream:
            return 'EndOfStream';
        case TokenType.NewLine:
            return 'NewLine';
        case TokenType.Indent:
            return 'Indent';
        case TokenType.Dedent:
            return 'Dedent';
        case TokenType.String:
            return 'String';
        case TokenType.Number:
            return 'Number';
        case TokenType.Identifier:
            return 'Identifier';
        case TokenType.Keyword:
            return 'Keyword';
        case TokenType.Operator:
            return 'Operator';
        case TokenType.Colon:
            return 'Colon';
        case TokenType.Semicolon:
            return 'Semicolon';
        case TokenType.Comma:
            return 'Comma';
        case TokenType.OpenParenthesis:
            return 'OpenParenthesis';
        case TokenType.CloseParenthesis:
            return 'CloseParenthesis';
        case TokenType.OpenBracket:
            return 'OpenBracket';
        case TokenType.CloseBracket:
            return 'CloseBracket';
        case TokenType.OpenCurlyBrace:
            return 'OpenCurlyBrace';
        case TokenType.CloseCurlyBrace:
            return 'CloseCurlyBrace';
        case TokenType.Ellipsis:
            return 'Ellipsis';
        case TokenType.Dot:
            return 'Dot';
        case TokenType.Arrow:
            return 'Arrow';
        case TokenType.Backtick:
            return 'Backtick';
        default:
            return 'Unknown!!';
    }
}

function getNewLineTypeString(type: NewLineType) {
    switch (type) {
        case NewLineType.CarriageReturn:
            return 'CarriageReturn';
        case NewLineType.LineFeed:
            return 'LineFeed';
        case NewLineType.CarriageReturnLineFeed:
            return 'CarriageReturnLineFeed';
        case NewLineType.Implied:
            return 'Implied';
        default:
            return 'Unknown!!';
    }
}

function getOperatorTypeString(type: OperatorType) {
    switch (type) {
        case OperatorType.Add:
            return 'Add';
        case OperatorType.AddEqual:
            return 'AddEqual';
        case OperatorType.Assign:
            return 'Assign';
        case OperatorType.BitwiseAnd:
            return 'BitwiseAnd';
        case OperatorType.BitwiseAndEqual:
            return 'BitwiseAndEqual';
        case OperatorType.BitwiseInvert:
            return 'BitwiseInvert';
        case OperatorType.BitwiseOr:
            return 'BitwiseOr';
        case OperatorType.BitwiseOrEqual:
            return 'BitwiseOrEqual';
        case OperatorType.BitwiseXor:
            return 'BitwiseXor';
        case OperatorType.BitwiseXorEqual:
            return 'BitwiseXorEqual';
        case OperatorType.Divide:
            return 'Divide';
        case OperatorType.DivideEqual:
            return 'DivideEqual';
        case OperatorType.Equals:
            return 'Equals';
        case OperatorType.FloorDivide:
            return 'FloorDivide';
        case OperatorType.FloorDivideEqual:
            return 'FloorDivideEqual';
        case OperatorType.GreaterThan:
            return 'GreaterThan';
        case OperatorType.GreaterThanOrEqual:
            return 'GreaterThanOrEqual';
        case OperatorType.LeftShift:
            return 'LeftShift';
        case OperatorType.LeftShiftEqual:
            return 'LeftShiftEqual';
        case OperatorType.LessOrGreaterThan:
            return 'LessOrGreaterThan';
        case OperatorType.LessThan:
            return 'LessThan';
        case OperatorType.LessThanOrEqual:
            return 'LessThanOrEqual';
        case OperatorType.MatrixMultiply:
            return 'MatrixMultiply';
        case OperatorType.MatrixMultiplyEqual:
            return 'MatrixMultiplyEqual';
        case OperatorType.Mod:
            return 'Mod';
        case OperatorType.ModEqual:
            return 'ModEqual';
        case OperatorType.Multiply:
            return 'Multiply';
        case OperatorType.MultiplyEqual:
            return 'MultiplyEqual';
        case OperatorType.NotEquals:
            return 'NotEquals';
        case OperatorType.Power:
            return 'Power';
        case OperatorType.PowerEqual:
            return 'PowerEqual';
        case OperatorType.RightShift:
            return 'RightShift';
        case OperatorType.RightShiftEqual:
            return 'RightShiftEqual';
        case OperatorType.Subtract:
            return 'Subtract';
        case OperatorType.SubtractEqual:
            return 'SubtractEqual';
        case OperatorType.Walrus:
            return 'Walrus';
        case OperatorType.And:
            return 'And';
        case OperatorType.Or:
            return 'Or';
        case OperatorType.Not:
            return 'Not';
        case OperatorType.Is:
            return 'Is';
        case OperatorType.IsNot:
            return 'IsNot';
        case OperatorType.In:
            return 'In';
        case OperatorType.NotIn:
            return 'NotIn';
        default:
            return 'Unknown!!';
    }
}

function getKeywordTypeString(type: KeywordType) {
    switch (type) {
        case KeywordType.And:
            return 'And';
        case KeywordType.As:
            return 'As';
        case KeywordType.Assert:
            return 'Assert';
        case KeywordType.Async:
            return 'Async';
        case KeywordType.Await:
            return 'Await';
        case KeywordType.Break:
            return 'Break';
        case KeywordType.Class:
            return 'Class';
        case KeywordType.Continue:
            return 'Continue';
        case KeywordType.Debug:
            return 'Debug';
        case KeywordType.Def:
            return 'Def';
        case KeywordType.Del:
            return 'Del';
        case KeywordType.Elif:
            return 'Elif';
        case KeywordType.Else:
            return 'Else';
        case KeywordType.Except:
            return 'Except';
        case KeywordType.False:
            return 'False';
        case KeywordType.Finally:
            return 'Finally';
        case KeywordType.For:
            return 'For';
        case KeywordType.From:
            return 'From';
        case KeywordType.Global:
            return 'Global';
        case KeywordType.If:
            return 'If';
        case KeywordType.Import:
            return 'Import';
        case KeywordType.In:
            return 'In';
        case KeywordType.Is:
            return 'Is';
        case KeywordType.Lambda:
            return 'Lambda';
        case KeywordType.None:
            return 'None';
        case KeywordType.Nonlocal:
            return 'Nonlocal';
        case KeywordType.Not:
            return 'Not';
        case KeywordType.Or:
            return 'Or';
        case KeywordType.Pass:
            return 'Pass';
        case KeywordType.Raise:
            return 'Raise';
        case KeywordType.Return:
            return 'Return';
        case KeywordType.True:
            return 'True';
        case KeywordType.Try:
            return 'Try';
        case KeywordType.While:
            return 'While';
        case KeywordType.With:
            return 'With';
        case KeywordType.Yield:
            return 'Yield';
        default:
            return 'Unknown!!';
    }
}

function getStringTokenFlagsString(flags: StringTokenFlags) {
    const str = [];

    if (flags & StringTokenFlags.SingleQuote) {
        str.push('SingleQuote');
    }

    if (flags & StringTokenFlags.DoubleQuote) {
        str.push('DoubleQuote');
    }

    if (flags & StringTokenFlags.Triplicate) {
        str.push('Triplicate');
    }

    if (flags & StringTokenFlags.Raw) {
        str.push('Raw');
    }

    if (flags & StringTokenFlags.Unicode) {
        str.push('Unicode');
    }

    if (flags & StringTokenFlags.Bytes) {
        str.push('Bytes');
    }

    if (flags & StringTokenFlags.Format) {
        str.push('Format');
    }

    if (flags & StringTokenFlags.Unterminated) {
        str.push('Unterminated');
    }

    return str.join(',');
}
