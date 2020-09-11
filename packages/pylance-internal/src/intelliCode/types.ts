/*
 * nodes.ts
 *
 * Definitions of IntelliCode data based on AST nodes.
 */

import { ParseNode, ParseNodeType } from 'pyright-internal/parser/parseNodes';

class KeyValueWithLocation {
    readonly spanStart: number;

    constructor(public readonly key: string, public readonly value: string | undefined, spanStart?: number) {
        this.spanStart = spanStart || 0;
    }
}

export class Assignment extends KeyValueWithLocation {
    constructor(key: string, value: string, spanStart?: number) {
        super(key, value, spanStart);
    }
}

export class MethodInvokation extends KeyValueWithLocation {
    constructor(key: string, value: string | undefined, spanStart?: number) {
        super(key, value, spanStart);
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

export enum LiteralTokenValue {
    String = 'STR_LIT',
    Number = 'NUM_LIT',
}

// Determine the type of the variable and return a variable to type value pair.
export function getStandardVariableType(node: ParseNode) {
    switch (node.nodeType) {
        case ParseNodeType.String:
            return StandardVariableType.String;
        case ParseNodeType.Number:
            return node.value === Math.round(node.value) ? StandardVariableType.Int : StandardVariableType.Float;
    }
    return StandardVariableType.Null;
}

export class IntelliCodeConstants {
    public static readonly NullSequence = 'N';
    public static readonly SequenceDelimiter = '~';
    public static readonly UnicodeStar = '\u2605 ';
    public static readonly MaxRecommendation = 5;
    public static readonly PrecedingSequenceLength = 2;
    public static readonly CompletionItemCommand = 'vsintellicode.completionItemSelected';

    // Allow saving sequences when parent token type is unavailable (for DL models)
    public static readonly IncludeUnresolvedType = true;
    public static readonly UnresolvedType = 'unktype';
}

export enum FailureReason {
    None = 'None',
    NotInModel = 'NotInModel',
    NotInIntersection = 'NotInIntersection',
}

export enum ModelType {
    None = 'None',
    Frequency = 'Frequency',
    Sequence = 'Sequence',
    LSTM = 'LSTM',
}
