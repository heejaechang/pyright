import {
    CancellationToken,
    SemanticTokens,
    SemanticTokensBuilder,
    SemanticTokensClientCapabilities,
    SemanticTokensLegend,
} from 'vscode-languageserver';

import { DeclarationType, FunctionDeclaration, ParameterDeclaration } from 'pyright-internal/analyzer/declaration';
import {
    getEnclosingClass,
    isWithinAnnotationComment,
    isWithinTypeAnnotation,
} from 'pyright-internal/analyzer/parseTreeUtils';
import { ParseTreeWalker } from 'pyright-internal/analyzer/parseTreeWalker';
import { Program } from 'pyright-internal/analyzer/program';
import { isConstantName, isDunderName } from 'pyright-internal/analyzer/symbolNameUtils';
import { TypeEvaluator } from 'pyright-internal/analyzer/typeEvaluator';
import { ClassType, FunctionTypeFlags, TypeCategory } from 'pyright-internal/analyzer/types';
import { isProperty } from 'pyright-internal/analyzer/typeUtils';
import { throwIfCancellationRequested } from 'pyright-internal/common/cancellationUtils';
import { assertDefined } from 'pyright-internal/common/debug';
import { convertOffsetsToRange, convertOffsetToPosition } from 'pyright-internal/common/positionUtils';
import { doRangesOverlap, Range } from 'pyright-internal/common/textRange';
import {
    CaseNode,
    ConstantNode,
    DecoratorNode,
    MatchNode,
    ModuleNameNode,
    NameNode,
    ParseNode,
    ParseNodeType,
    StatementListNode,
    StringNode,
    SuiteNode,
} from 'pyright-internal/parser/parseNodes';
import { ParseResults } from 'pyright-internal/parser/parser';

// List of standard token types and modifiers for VS Code at
// https://code.visualstudio.com/api/language-extensions/semantic-highlight-guide#semantic-token-classification
// (or look at the capability while stepping in computeLegend in debugger)

enum TokenTypes {
    comment = 0,
    keyword = 1,
    string = 2,
    number = 3,
    regexp = 4,
    type = 5,
    class = 6,
    interface = 7,
    enum = 8,
    enumMember = 9,
    typeParameter = 10,
    function = 11,
    method = 12,
    property = 13,
    variable = 14,
    parameter = 15,
    module = 16,
    intrinsic = 17,
    selfParameter = 18,
    clsParameter = 19,
    magicFunction = 20,
    builtinConstant = 21,
    _ = 22,
}

enum TokenModifiers {
    none = 0,
    declaration = 1 << 0,
    static = 1 << 1,
    abstract = 1 << 2,
    async = 1 << 3,
    documentation = 1 << 4,
    typeHint = 1 << 5,
    typeHintComment = 1 << 6,
    readonly = 1 << 7,
    decorator = 1 << 8,
    builtin = 1 << 9,
}

interface TokenInfo {
    type: TokenTypes;
    modifiers: TokenModifiers;
}

const keywordLengths: { [key in ParseNodeType]?: number } = {
    [ParseNodeType.Match]: 'match'.length,
    [ParseNodeType.Case]: 'case'.length,
};

// The normal pattern would be to have this method on Program and SourceFile,
// but since we don't have a pylance specific class for those, it's exposed
// as a global function here.
export function getSemanticTokens(
    program: Program,
    filePath: string,
    range: Range | undefined,
    previousResultId: string | undefined,
    token: CancellationToken
): SemanticTokens {
    const sourceFile = program.getBoundSourceFile(filePath);
    if (sourceFile === undefined) {
        return { data: [] };
    }

    const parseResults = sourceFile.getParseResults();
    if (parseResults === undefined || sourceFile.getFileContents() === undefined) {
        return { data: [] };
    }

    return SemanticTokenProvider.getTokens(parseResults, filePath, program.evaluator!, range, previousResultId, token);
}

export class SemanticTokenProvider {
    static computeLegend(capability: SemanticTokensClientCapabilities): SemanticTokensLegend {
        const tokenTypes: string[] = [];
        for (let i = 0; i < TokenTypes._; i++) {
            const str = TokenTypes[i];
            tokenTypes.push(str);
        }

        const tokenModifiers: string[] = [
            'declaration',
            'static',
            'abstract',
            'async',
            'documentation',
            'typeHint',
            'typeHintComment',
            'readonly',
            'decorator',
            'builtin',
        ];

        return { tokenTypes, tokenModifiers };
    }

    static getTokens(
        parseResults: ParseResults,
        filePath: string,
        evaluator: TypeEvaluator,
        range: Range | undefined,
        previousResultId: string | undefined,
        token: CancellationToken
    ): SemanticTokens {
        throwIfCancellationRequested(token);

        const builder = getTokenBuilder(filePath, previousResultId);

        const walker = new TokenWalker(builder, parseResults, evaluator, range, token);
        walker.walk(parseResults.parseTree);

        return builder.build();
    }
}

const tokenBuilders: Map<string, SemanticTokensBuilder> = new Map();

function getTokenBuilder(filePath: string, previousResult: string | undefined = undefined): SemanticTokensBuilder {
    let result = tokenBuilders.get(filePath);

    // We only re-use an existing instance in the case of edit
    // otherwise we use a clean instance to guarantee that there
    // is no existing data in the builder (from a previous query).
    // For edit, the call to previousResult clears the existing data.
    if (result !== undefined && previousResult !== undefined) {
        result.previousResult(previousResult);
        return result;
    }
    result = new SemanticTokensBuilder();
    tokenBuilders.set(filePath, result);
    return result;
}

class TokenWalker extends ParseTreeWalker {
    // Some nodes have their token info saved in a cache once calculated.
    // This is only done for nodes whose info we need more than once during the
    // parse tree walk.
    private _cachedNodeTokenInfo = new Map<ParseNode, TokenInfo | undefined>();

    constructor(
        private _builder: SemanticTokensBuilder,
        private _parseResults: ParseResults,
        private _evaluator: TypeEvaluator,
        private _range: Range | undefined,
        private _cancellationToken: CancellationToken
    ) {
        super();
    }

    override visitSuite(node: SuiteNode) {
        // Perf optimization when out of range
        return this._isNodeInRange(node) ? true : false;
    }

    override visitStatementList(node: StatementListNode) {
        // Perf optimization when out of range
        return this._isNodeInRange(node) ? true : false;
    }

    override visitName(node: NameNode) {
        throwIfCancellationRequested(this._cancellationToken);

        if (!this._isNodeInRange(node)) {
            return false;
        }

        const tokenInfo = this._getNameNodeToken(node);
        if (tokenInfo) {
            this._pushToken(node, tokenInfo.type, tokenInfo.modifiers);
        }

        return true;
    }

    override visitString(node: StringNode) {
        // Potential enhancement: distinguish regular string vs. docstring
        // type: string, modifier: documentation
        // or maybe
        // type: comment, modifier: documentation
        // If we don't differentiate, there is no benefit in creating a token
        // here, so do nothing for now.
        return true;
    }

    // Emit keywords for match/case; VS Code doesn't have these in its TextMate grammar yet.
    override visitMatch(node: MatchNode) {
        this._pushKeyword(node);
        return true;
    }

    override visitCase(node: CaseNode) {
        this._pushKeyword(node);
        return true;
    }

    // Emit tokens for builtin constants so that they are colored properly in string-based annotations.
    override visitConstant(node: ConstantNode) {
        this._pushToken(node, TokenTypes.builtinConstant, TokenModifiers.builtin | TokenModifiers.readonly);
        return true;
    }

    private _isNodeInRange(node: ParseNode) {
        if (this._range === undefined) {
            return true;
        }

        const nodeRange = convertOffsetsToRange(
            node.start,
            node.start + node.length,
            this._parseResults.tokenizerOutput.lines
        );
        return doRangesOverlap(nodeRange, this._range);
    }

    private _getParameterTokenType(decl: ParameterDeclaration): TokenTypes {
        const name = decl.node.name?.value;

        // Only consider self and cls if they are the first parameter
        const parent = decl.node.parent;
        if (parent?.nodeType === ParseNodeType.Function) {
            if (parent.parameters.length > 0 && parent.parameters[0].name?.value === name) {
                switch (name) {
                    case 'self':
                        return TokenTypes.selfParameter;
                    case 'cls':
                        return TokenTypes.clsParameter;
                    default:
                        return TokenTypes.parameter;
                }
            }
        }

        return TokenTypes.parameter;
    }

    private _getEnclosingDecorator(node: ParseNode): DecoratorNode | undefined {
        let curNode = node.parent;
        while (curNode) {
            if (curNode.nodeType === ParseNodeType.Decorator) {
                return curNode;
            }

            if (
                curNode.nodeType === ParseNodeType.Class ||
                curNode.nodeType === ParseNodeType.Function ||
                curNode.nodeType === ParseNodeType.Parameter ||
                curNode.nodeType === ParseNodeType.Argument
            ) {
                return undefined;
            }

            curNode = curNode.parent;
        }

        return undefined;
    }

    private _getDecoratorModifiers(node: NameNode): TokenModifiers {
        if (this._getEnclosingDecorator(node) !== undefined) {
            return TokenModifiers.decorator;
        } else {
            return TokenModifiers.none;
        }
    }

    private _getFunctionTokenType(node: NameNode, decl: FunctionDeclaration): TokenTypes {
        if (isDunderName(node.value)) {
            return TokenTypes.magicFunction;
        } else if (decl.isMethod) {
            return TokenTypes.method;
        } else {
            return TokenTypes.function;
        }
    }

    private _getBuiltinModifiers(moduleName: string): TokenModifiers {
        return moduleName === 'builtins' ? TokenModifiers.builtin : TokenModifiers.none;
    }

    private _getTypeAnnotationModifiers(node: NameNode): TokenModifiers {
        if (isWithinAnnotationComment(node)) {
            return TokenModifiers.typeHintComment;
        } else if (isWithinTypeAnnotation(node, false)) {
            return TokenModifiers.typeHint;
        } else {
            return TokenModifiers.none;
        }
    }

    private _getNameNodeToken(node: NameNode): TokenInfo | undefined {
        if (this._cachedNodeTokenInfo.has(node)) {
            return this._cachedNodeTokenInfo.get(node);
        }

        if (!this._evaluator.isNodeReachable(node)) {
            return undefined;
        }

        const declarations = this._evaluator.getDeclarationsForNameNode(node);
        if (declarations && declarations.length > 0) {
            const resolvedDecl = this._evaluator.resolveAliasDeclaration(declarations[0], /* resolveLocalNames */ true);
            if (resolvedDecl) {
                const builtinModifiers = this._getBuiltinModifiers(resolvedDecl.moduleName);
                const typeAnnotationModifiers = this._getTypeAnnotationModifiers(node);
                switch (resolvedDecl.type) {
                    case DeclarationType.Intrinsic:
                        return { type: TokenTypes.intrinsic, modifiers: TokenModifiers.none };
                    case DeclarationType.Parameter: {
                        const declarationModifiers =
                            node.parent?.nodeType === ParseNodeType.Parameter
                                ? TokenModifiers.declaration
                                : TokenModifiers.none;
                        return { type: this._getParameterTokenType(resolvedDecl), modifiers: declarationModifiers };
                    }
                    case DeclarationType.SpecialBuiltInClass:
                        return {
                            type: TokenTypes.class,
                            modifiers: typeAnnotationModifiers | builtinModifiers,
                        };
                    case DeclarationType.Class: {
                        const declarationModifiers =
                            node.parent?.nodeType === ParseNodeType.Class
                                ? TokenModifiers.declaration
                                : TokenModifiers.none;
                        const decoratorModifiers = this._getDecoratorModifiers(node);
                        const classTypeInfo = this._evaluator.getTypeOfClass(resolvedDecl.node);
                        const tokenModifiers =
                            typeAnnotationModifiers | decoratorModifiers | declarationModifiers | builtinModifiers;
                        if (classTypeInfo && ClassType.isEnumClass(classTypeInfo.classType)) {
                            return {
                                type: TokenTypes.enum,
                                modifiers: tokenModifiers,
                            };
                        } else {
                            return {
                                type: TokenTypes.class,
                                modifiers: tokenModifiers,
                            };
                        }
                    }
                    case DeclarationType.Function: {
                        let tokenType = TokenTypes.function;
                        const declarationModifiers =
                            node.parent?.nodeType === ParseNodeType.Function
                                ? TokenModifiers.declaration
                                : TokenModifiers.none;
                        let modifier = this._getDecoratorModifiers(node) | declarationModifiers | builtinModifiers;

                        const declaredType = this._evaluator.getTypeForDeclaration(resolvedDecl);
                        if (declaredType) {
                            if (resolvedDecl.isMethod && isProperty(declaredType)) {
                                tokenType = TokenTypes.property;
                            }

                            if (declaredType.category === TypeCategory.Function) {
                                tokenType = this._getFunctionTokenType(node, resolvedDecl);

                                if (declaredType.details.flags & FunctionTypeFlags.AbstractMethod) {
                                    modifier = modifier | TokenModifiers.abstract;
                                }
                                if (declaredType.details.flags & FunctionTypeFlags.StaticMethod) {
                                    modifier = modifier | TokenModifiers.static;
                                }
                                if (declaredType.details.flags & FunctionTypeFlags.Async) {
                                    modifier = modifier | TokenModifiers.async;
                                }
                            }
                        }
                        return { type: tokenType, modifiers: modifier };
                    }
                    case DeclarationType.Variable: {
                        const declarationModifiers =
                            resolvedDecl.node.id === node.id ? TokenModifiers.declaration : TokenModifiers.none;
                        const modifier =
                            this._getDecoratorModifiers(node) |
                            declarationModifiers |
                            typeAnnotationModifiers |
                            builtinModifiers;
                        const enclosingClass = getEnclosingClass(resolvedDecl.node, /* stopAtFunction */ true);
                        if (enclosingClass) {
                            const classTypeInfo = this._evaluator.getTypeOfClass(enclosingClass);
                            if (classTypeInfo && ClassType.isEnumClass(classTypeInfo.classType)) {
                                return { type: TokenTypes.enumMember, modifiers: modifier };
                            } else {
                                return { type: TokenTypes.property, modifiers: modifier };
                            }
                        } else {
                            if (
                                node.parent?.nodeType === ParseNodeType.MemberAccess &&
                                node.parent?.memberName.id === node.id
                            ) {
                                return { type: TokenTypes.property, modifiers: modifier };
                            }

                            return {
                                type: TokenTypes.variable,
                                modifiers: isConstantName(node.value) ? modifier | TokenModifiers.readonly : modifier,
                            };
                        }
                        break;
                    }
                    case DeclarationType.Alias: {
                        const modifier = this._getDecoratorModifiers(node) | typeAnnotationModifiers;
                        return { type: TokenTypes.module, modifiers: modifier };
                    }
                }
            }
        } else {
            // Handle 'module' in 'package.module.MyClass()'
            const modifier = this._getDecoratorModifiers(node);
            const type = this._evaluator.getType(node);
            if (type?.category === TypeCategory.Module) {
                return { type: TokenTypes.module, modifiers: modifier };
            } else if (node.parent?.nodeType === ParseNodeType.ModuleName) {
                // Handle 'package' or 'sub' in 'from package.sub.module import MyClass'
                // In a from import statement, we can only get the type for the last name part
                // ('module' in the example above)
                // We can try resolving the last name part, if it is resolved, then
                // we know that this node is a valid module.
                // If the last name part is unresolved, then it is inconclusive
                // so we won't create a token for this node.
                const moduleNameNode = node.parent as ModuleNameNode;
                if (moduleNameNode.nameParts.length > 1) {
                    const lastNameNode = moduleNameNode.nameParts[moduleNameNode.nameParts.length - 1];
                    if (lastNameNode !== node) {
                        const tokenInfo = this._getNameNodeToken(lastNameNode);

                        // Cache the module last name node's token info since we'll visit that node again later.
                        this._cachedNodeTokenInfo.set(lastNameNode, tokenInfo);
                        return tokenInfo;
                    }
                }
            }
        }

        return undefined;
    }

    private _pushToken(node: ParseNode, tokenType: TokenTypes, tokenModifiers: TokenModifiers) {
        const pos = convertOffsetToPosition(node.start, this._parseResults.tokenizerOutput.lines);
        this._builder.push(pos.line, pos.character, node.length, tokenType, tokenModifiers);
    }

    private _pushKeyword(node: ParseNode) {
        const keywordLength = keywordLengths[node.nodeType];
        assertDefined(keywordLength, 'unknown keyword');
        const pos = convertOffsetToPosition(node.start, this._parseResults.tokenizerOutput.lines);
        this._builder.push(pos.line, pos.character, keywordLength, TokenTypes.keyword, TokenModifiers.none);
    }
}
