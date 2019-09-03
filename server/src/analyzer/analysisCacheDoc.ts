/*
* analysisCacheDoc.ts
* Copyright (c) Microsoft Corporation.
* Licensed under the MIT license.
* Author: Eric Traut
*
* Represents the serialized form of an analyzed file.
*/

import { DiagnosticAction, DiagnosticCategory, DiagnosticTextRange } from '../common/diagnostic';
import { ParameterCategory } from '../parser/parseNodes';
import { DeclarationCategory } from './declaration';
import { ClassTypeFlags, FunctionTypeFlags, TypeCategory } from './types';

// Increase this number to invalidate the cache (and delete existing
// cache files) the next time the analyzer runs. This should be done
// when a breaking change is made to the cache format, new analysis
// options are added, etc.
export const currentCacheDocVersion = 1;

export interface CachedDiagnostic {
    category: DiagnosticCategory;
    message: string;
    range: string;
    actions?: DiagnosticAction[];
}

export interface CachedType {
    category: TypeCategory;
}

export interface CachedModuleType extends CachedType {
    fields: CachedSymbolTable;
    docString?: string;
    isPartialModule?: boolean;
}

export interface CachedBaseClass {
    type: CachedTypeRef;
    isMetaclass?: boolean;
}

export interface CachedClassType extends CachedType {
    name: string;
    flags: ClassTypeFlags;
    typeSourceId: string;
    baseClasses: CachedBaseClass[];
    aliasClass?: CachedTypeRef;
    classFields: CachedSymbolTable;
    instanceFields: CachedSymbolTable;
    typeParameters: CachedTypeRef[];
    isAbstractClass: boolean;
    docString?: string;
    typeArguments?: CachedTypeRef[];
    skipAbstractClassTest: boolean;
}

export interface CachedObjectType extends CachedType {
    classType: CachedTypeRef;
    literalValue?: number | boolean | string;
}

export interface CachedFunctionParameter {
    category: ParameterCategory;
    name?: string;
    hasDefault?: boolean;
    type: CachedTypeRef;
}

export interface CachedFunctionType extends CachedType {
    flags: FunctionTypeFlags;
    parameters: CachedFunctionParameter[];
    declaredReturnType?: CachedTypeRef;
    inferredReturnType: CachedTypeRef;
    inferredYieldType: CachedTypeRef;
    builtInName?: string;
    docString?: string;
    specializedParameterTypes?: CachedTypeRef[];
    specializedReturnType?: CachedTypeRef;
}

export interface CachedOverloadedFunctionEntry {
    type: CachedTypeRef;
    typeSourceId: string;
}

export interface CachedOverloadedFunctionType extends CachedType {
    overloads: CachedOverloadedFunctionEntry[];
}

export interface CachedPropertyType extends CachedType {
    getter: CachedTypeRef;
    setter?: CachedTypeRef;
    deleter?: CachedTypeRef;
}

export interface CachedUnionType extends CachedType {
    types: CachedTypeRef[];
}

export interface CachedTypeVarType extends CachedType {
    name: string;
    constraints: CachedTypeRef[];
    boundType?: CachedTypeRef;
    isCovariant: boolean;
    isContravariant: boolean;
}

export type LocalTypeRef = number;
export interface RemoteTypeRef {
    remoteTypeCategory: TypeCategory.Class | TypeCategory.Module;
    remotePath: string;
    remoteTypeSourceId?: string;
}

export type CachedTypeRef = LocalTypeRef | RemoteTypeRef;

export interface CachedDeclaration {
    category: DeclarationCategory;
    typeSourceId: string;
    declaredType?: CachedTypeRef;
    isConstant?: boolean;
    path: string;
    range: string;
}

export interface CachedSymbol {
    inferredType: CachedTypeRef;
    declarations?: CachedDeclaration[];
    isInitiallyUnbound?: boolean;
    isExternallyHidden?: boolean;
}

export type CachedSymbolTable = { [name: string]: CachedSymbol };

export type CachedTypeMap = { [typeId: number]: CachedType };

export interface AnalysisCacheDoc {
    cacheVersion: number;
    filePath: string;
    optionsStringHash: string;
    fileContentsHash: string;
    diagnostics: CachedDiagnostic[];
    primaryModuleType: LocalTypeRef;
    types: CachedTypeMap;
    dependsOnFilePaths: string[];
}
