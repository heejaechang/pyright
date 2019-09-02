/*
* analysisCacheSerializer.ts
* Copyright (c) Microsoft Corporation.
* Licensed under the MIT license.
* Author: Eric Traut
*
* Logic that serializes the type information for a source file into
* a "document" that can be persisted to a JSON file.
*/

import * as assert from 'assert';

import { Diagnostic } from '../common/diagnostic';
import { AnalysisCacheDoc, CachedClassType, CachedDeclaration, CachedDiagnostic,
    CachedFunctionType, CachedModuleType, CachedObjectType,
    CachedOverloadedFunctionType, CachedPropertyType, CachedSymbol,
    CachedSymbolTable, CachedType, CachedTypeMap, CachedTypeRef,
    CachedTypeVarType, CachedUnionType, currentCacheDocVersion
    } from './analysisCacheDoc';
import { Declaration } from './declaration';
import { Symbol, SymbolTable } from './symbol';
import { ClassType, FunctionType, ModuleType, ObjectType, OverloadedFunctionType,
    PropertyType, Type, TypeCategory, TypeVarType, UnionType } from './types';

type DependencyMap = { [path: string]: string };

interface SerializerInfo {
    sourceFilePath: string;
    typeMap: CachedTypeMap;
    dependencyMap: DependencyMap;
}

export class AnalysisCacheSerializer {
    static serializeToDocument(sourceFilePath: string, optionsStrHash: string,
            fileContentsHash: string, diagnostics: Diagnostic[],
            moduleType: ModuleType) {

        const typeMap: CachedTypeMap = {};
        const serializerInfo: SerializerInfo = {
            sourceFilePath,
            typeMap,
            dependencyMap: {}
        };

        const primaryModuleType = this._serializeTypeRef(
            moduleType, serializerInfo);

        const cacheDoc: AnalysisCacheDoc = {
            cacheVersion: currentCacheDocVersion,
            filePath: sourceFilePath,
            optionsStringHash: optionsStrHash,
            fileContentsHash,
            diagnostics: [],
            primaryModuleType,
            types: typeMap,
            dependsOnFilePaths: []
        };

        diagnostics.forEach(diag => {
            cacheDoc.diagnostics.push(this._serializeDiagnostic(diag));
        });

        Object.keys(serializerInfo.dependencyMap).forEach(path => {
            cacheDoc.dependsOnFilePaths.push(path);
        });

        return cacheDoc;
    }

    private static _serializeSymbolTable(symbolTable: SymbolTable,
            serializerInfo: SerializerInfo): CachedSymbolTable {

        const cachedSymbolTable: CachedSymbolTable = {};

        symbolTable.forEach((symbol, name) => {
            cachedSymbolTable[name] = this._serializeSymbol(symbol, serializerInfo);
        });

        return cachedSymbolTable;
    }

    private static _serializeSymbol(symbol: Symbol, serializerInfo: SerializerInfo) {
        const cachedSymbol: CachedSymbol = {
            inferredType: this._serializeTypeRef(symbol.getInferredType(), serializerInfo),
            declarations: symbol.getDeclarations().map(
                decl => this._serializeDeclaration(decl, serializerInfo)),
            isInitiallyUnbound: symbol.isInitiallyUnbound(),
            isExternallyHidden: symbol.isExternallyHidden(),
            isAccessed: symbol.isAccessed()
        };

        return cachedSymbol;
    }

    private static _serializeTypeRef(type: Type, serializerInfo: SerializerInfo): CachedTypeRef {
        // Handle classes and modules specially. We dont't want to
        // recursively add these because we'll end up pulling in the
        // entire program. For classes and modules that are outside of
        // this file, we'll use a remote encoding instead.
        if (type instanceof ClassType) {
            if (type.getSourceFilePath() !== serializerInfo.sourceFilePath) {
                const sourceFilePath = type.getSourceFilePath();
                serializerInfo.dependencyMap[sourceFilePath] = sourceFilePath;

                return {
                    localId: -1,
                    remotePath: sourceFilePath,
                    remoteTypeCategory: TypeCategory.Class,
                    remoteTypeSourceId: type.getTypeSourceId()
                };
            }
        } else if (type instanceof ModuleType) {
            if (type.getSourceFilePath() !== serializerInfo.sourceFilePath) {
                const sourceFilePath = type.getSourceFilePath();
                serializerInfo.dependencyMap[sourceFilePath] = sourceFilePath;

                return {
                    localId: -1,
                    remotePath: sourceFilePath,
                    remoteTypeCategory: TypeCategory.Module
                };
            }
        }

        if (!serializerInfo.typeMap[type.id]) {
            // Temporarily enter a dummy entry. This is needed for
            // auto-referential recursive types. If we don't do this,
            // we will recurse indefinitely.
            serializerInfo.typeMap[type.id] = { category: TypeCategory.Unknown };
            serializerInfo.typeMap[type.id] = this._serializeType(type, serializerInfo);
        }

        return {
            localId: type.id
        };
    }

    private static _serializeType(type: Type, serializerInfo: SerializerInfo): CachedType {
        let cachedType: CachedType;

        switch (type.category) {
            case TypeCategory.Unbound:
            case TypeCategory.Unknown:
            case TypeCategory.Any:
            case TypeCategory.Ellipsis:
            case TypeCategory.None:
            case TypeCategory.Never:
                // Nothing more to do for these type categories.
                cachedType  = {
                    category: type.category
                };
                break;

            case TypeCategory.Function: {
                const functionType = type as FunctionType;
                const returnType = functionType.getDeclaredReturnType();
                const specializedTypes = functionType.getSpecializedTypes();

                const functionCachedType: CachedFunctionType = {
                    category: TypeCategory.Function,
                    flags: functionType.getFlags(),
                    parameters: functionType.getParameters().map(param => {
                        return {
                            category: param.category,
                            name: param.name,
                            hasDefault: param.hasDefault,
                            type: this._serializeTypeRef(param.type, serializerInfo)
                        };
                    }),
                    declaredReturnType: returnType ?
                        this._serializeTypeRef(returnType, serializerInfo) :
                        undefined,
                    inferredReturnType: this._serializeTypeRef(
                        functionType.getInferredReturnType().getType(), serializerInfo),
                    inferredYieldType: this._serializeTypeRef(
                        functionType.getInferredYieldType().getType(), serializerInfo),
                    builtInName: functionType.getBuiltInName(),
                    docString: functionType.getDocString(),
                    specializedParameterTypes: specializedTypes ?
                        specializedTypes.parameterTypes.map(
                            t => this._serializeTypeRef(t, serializerInfo)) :
                        undefined,
                    specializedReturnType: specializedTypes ?
                        this._serializeTypeRef(specializedTypes.returnType, serializerInfo) :
                        undefined
                };

                cachedType = functionCachedType;
                break;
            }

            case TypeCategory.OverloadedFunction: {
                const overloadedType = type as OverloadedFunctionType;

                const overloadedCachedType: CachedOverloadedFunctionType = {
                    category: TypeCategory.OverloadedFunction,
                    overloads: overloadedType.getOverloads().map(overload => {
                        return {
                            type: this._serializeTypeRef(overload.type, serializerInfo),
                            typeSourceId: overload.typeSourceId
                        };
                    })
                };

                cachedType = overloadedCachedType;
                break;
            }

            case TypeCategory.Property: {
                const propertyType = type as PropertyType;
                const setter = propertyType.getSetter();
                const deleter = propertyType.getDeleter();

                const cachedPropertyType: CachedPropertyType = {
                    category: TypeCategory.Property,
                    getter: this._serializeTypeRef(propertyType.getGetter(), serializerInfo),
                    setter: setter ? this._serializeTypeRef(setter, serializerInfo) : undefined,
                    deleter: deleter ? this._serializeTypeRef(deleter, serializerInfo) : undefined
                };

                cachedType = cachedPropertyType;
                break;
            }

            case TypeCategory.Class: {
                const classType = type as ClassType;

                // We should be serializing only classes that are declared
                // in this file.
                assert(serializerInfo.sourceFilePath === classType.getSourceFilePath());

                const aliasClass = classType.getAliasClass();
                const typeArgs = classType.getTypeArguments();

                const cachedClassType: CachedClassType = {
                    category: TypeCategory.Class,
                    name: classType.getClassName(),
                    flags: classType.getClassFlags(),
                    typeSourceId: classType.getTypeSourceId(),
                    baseClasses: classType.getBaseClasses().map(baseClass => {
                        return {
                            type: this._serializeTypeRef(baseClass.type, serializerInfo),
                            isMetaclass: baseClass.isMetaclass
                        };
                    }),
                    aliasClass: aliasClass ?
                        this._serializeTypeRef(aliasClass, serializerInfo) :
                        undefined,
                    classFields: this._serializeSymbolTable(classType.getClassFields(), serializerInfo),
                    instanceFields: this._serializeSymbolTable(classType.getInstanceFields(), serializerInfo),
                    typeParameters: classType.getTypeParameters().map(t => {
                        return this._serializeTypeRef(t, serializerInfo);
                    }),
                    isAbstractClass: classType.isAbstractClass(),
                    docString: classType.getDocString(),
                    typeArguments: typeArgs ?
                        typeArgs.map(t => this._serializeTypeRef(t, serializerInfo)) :
                        undefined,
                    skipAbstractClassTest: classType.isSkipAbstractClassTest()
                };

                cachedType = cachedClassType;
                break;
            }

            case TypeCategory.Object: {
                const objectType = type as ObjectType;

                const cachedObjectType: CachedObjectType = {
                    category: TypeCategory.Object,
                    classType: this._serializeTypeRef(objectType.getClassType(),
                        serializerInfo),
                    literalValue: objectType.getLiteralValue()
                };

                cachedType = cachedObjectType;
                break;
            }

            case TypeCategory.Module: {
                const moduleType = type as ModuleType;

                // We should be serializing only module types that are
                // declared in this file.
                assert(serializerInfo.sourceFilePath === moduleType.getSourceFilePath());

                const cachedModuleType: CachedModuleType = {
                    category: TypeCategory.Module,
                    fields: this._serializeSymbolTable(moduleType.getFields(), serializerInfo)

                };

                cachedType = cachedModuleType;
                break;
            }

            case TypeCategory.Union: {
                const unionType = type as UnionType;

                const cachedUnionType: CachedUnionType = {
                    category: TypeCategory.Union,
                    types: unionType.getTypes().map(t =>
                        this._serializeTypeRef(t, serializerInfo))
                };

                cachedType = cachedUnionType;
                break;
            }

            case TypeCategory.TypeVar: {
                const typeVarType = type as TypeVarType;
                const boundType = typeVarType.getBoundType();

                const cachedTypeVarType: CachedTypeVarType = {
                    category: TypeCategory.TypeVar,
                    name: typeVarType.getName(),
                    constraints: typeVarType.getConstraints().map(t =>
                        this._serializeTypeRef(t, serializerInfo)),
                    boundType: boundType ?
                        this._serializeTypeRef(boundType, serializerInfo) :
                        undefined,
                    isCovariant: typeVarType.isCovariant(),
                    isContravariant: typeVarType.isContravariant()
                };

                cachedType = cachedTypeVarType;
                break;
            }

            default: {
                // We should never get here.
                throw new Error('Unexpected type category in _serializeType');
            }
        }

        return cachedType;
    }

    private static _serializeDeclaration(declaration: Declaration,
            serializerInfo: SerializerInfo): CachedDeclaration {

        const cachedDecl: CachedDeclaration = {
            category: declaration.category,
            typeSourceId: declaration.typeSourceId,
            declaredType: declaration.declaredType ?
                this._serializeTypeRef(declaration.declaredType, serializerInfo) :
                undefined,
            isConstant: declaration.isConstant,
            path: declaration.path,
            range: declaration.range
        };

        return cachedDecl;
    }

    private static _serializeDiagnostic(diag: Diagnostic): CachedDiagnostic {
        const cachedDiag: CachedDiagnostic = {
            category: diag.category,
            message: diag.message,
            range: diag.range,
            actions: diag.getActions()
        };

        return cachedDiag;
    }
}
