/*
 * nodes.ts
 *
 * Definitions of IntelliCode data based on AST nodes.
 */

import { ClassNode, FunctionNode, ModuleNode, ParseNode, ParseNodeType } from '../pyright/server/src/parser/parseNodes';

export class Assignment {
    readonly spanStart: number;

    constructor(public readonly key: string, public readonly value: string, spanStart?: number) {
        this.spanStart = spanStart || 0;
    }
}

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

export class StandardVariableType {
    public static readonly Null = 'Null';
    public static readonly Int = 'int';
    public static readonly Float = 'float';
    public static readonly String = 'str';
    public static readonly Tuple = 'tuple';
    public static readonly List = 'list';
    public static readonly Set = 'set';
    public static readonly Dictionary = 'dict';
}

// Determine the type of the variable and return a variable to type value pair.
export function getStandardVariableType(node: ParseNode) {
    switch (node.nodeType) {
        case ParseNodeType.String:
            return StandardVariableType.String;
        case ParseNodeType.Number:
            return node.value == Math.round(node.value) ? StandardVariableType.Int : StandardVariableType.Float;
    }
    return StandardVariableType.Null;
}

export class IntelliCodeConstants {
    public static readonly NullSequence = 'N';
    public static readonly SequenceDelimiter = '~';
    public static readonly UnicodeStar = '\u2605 ';
    public static readonly PrevSymbolOrNum = '$SYMBOL_OR_NUM$';
    public static readonly MaxRecommendation = 5;
    public static readonly PrecedingSequenceLength = 2;
    public static readonly CompletionItemCommand = 'vsintellicode.completionItemSelected';

    // Allow saving sequences when parent token type is unavailable (for DL models)
    public static readonly IncludeUnresolvedType = true;
    public static readonly UnresolvedType = 'unktype';
}
