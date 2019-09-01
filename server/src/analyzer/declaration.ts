/*
* declaration.ts
* Copyright (c) Microsoft Corporation.
* Licensed under the MIT license.
* Author: Eric Traut
*
* Tracks the location within the code where a named entity
* is declared and its associated declared type (if the type
* is explicitly declared).
*/

import { DiagnosticTextRange } from '../common/diagnostic';
import { ParseNode } from '../parser/parseNodes';
import { Type } from './types';

export enum DeclarationCategory {
    // These values are persisted in the analysis cache doc.
    // Don't change without incrementing the cache doc version.
    Variable = 1,
    Parameter = 2,
    Function = 3,
    Method = 4,
    Class = 5,
    Module = 6
}

export interface Declaration {
    // Category of this symbol (function, variable, etc.).
    // Used by hover provider to display helpful text.
    category: DeclarationCategory;

    // The node that contains the definition. This is valid
    // only during analysis and is not persisted to the cache.
    node?: ParseNode;

    // The type source ID of the node that contains
    // the definition. This is a persistent form of the
    // node.
    typeSourceId: string;

    // Declared type (if specified) of the symbol.
    declaredType?: Type;

    // Is the declaration considered "constant" (i.e.
    // reassignment is not permitted)?
    isConstant?: boolean;

    // The file and range within that file that
    // contains the declaration.
    path: string;
    range: DiagnosticTextRange;
}
