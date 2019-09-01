/*
* analysisCacheSerializer.ts
* Copyright (c) Microsoft Corporation.
* Licensed under the MIT license.
* Author: Eric Traut
*
* Logic that saves and restores analysis cache documents to
* the analysis cache.
*/

import { Diagnostic } from '../common/diagnostic';
import { AnalysisCache } from './analysisCache';
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

export class AnalysisCacheSerializer {
    writeToCache(cache: AnalysisCache, sourceFilePath: string, optionsStr: string,
            diagnostics: Diagnostic[], moduleSymbolTable: SymbolTable) {

        const cacheDoc: AnalysisCacheDoc = {
            cacheVersion: currentCacheDocVersion,
            filePath: sourceFilePath,
            optionsString: optionsStr,
            diagnostics: [],
            moduleSymbolTable: {},
            types: {}
        };

        diagnostics.forEach(diag => {
            cacheDoc.diagnostics.push(this._serializeDiagnostic(diag));
        });

        cacheDoc.moduleSymbolTable = this._serializeSymbolTable(
            moduleSymbolTable, cacheDoc.types);

        cache.writeCacheEntry(sourceFilePath, optionsStr, cacheDoc);
    }

    readFromCache() {
        // TODO - need to implement
    }

    private _serializeSymbolTable(symbolTable: SymbolTable, cachedTypes: CachedTypeMap): CachedSymbolTable {
        const cachedSymbolTable: CachedSymbolTable = {};

        symbolTable.forEach((symbol, name) => {
            cachedSymbolTable[name] = this._serializeSymbol(symbol, cachedTypes);
        });

        return cachedSymbolTable;
    }

    private _serializeSymbol(symbol: Symbol, cachedTypes: CachedTypeMap) {
        const cachedSymbol: CachedSymbol = {
            inferredType: this._serializeTypeRef(symbol.getInferredType(), cachedTypes),
            declarations: symbol.getDeclarations().map(decl => this._serializeDeclaration(decl, cachedTypes)),
            isInitiallyUnbound: symbol.isInitiallyUnbound(),
            isExternallyHidden: symbol.isExternallyHidden(),
            isAccessed: symbol.isAccessed()
        };

        return cachedSymbol;
    }

    private _serializeTypeRef(type: Type, cachedTypes: CachedTypeMap): CachedTypeRef {
        if (!cachedTypes[type.id]) {
            // Temporarily enter a dummy entry. This is needed for
            // auto-referential recursive types.
            cachedTypes[type.id] = { category: TypeCategory.Unknown };
            cachedTypes[type.id] = this._serializeType(type, cachedTypes);
        }

        return {
            localTypeId: type.id
        };
    }

    private _serializeType(type: Type, cachedTypes: CachedTypeMap): CachedType {
        let cachedType: CachedType;

        switch (type.category) {
            case TypeCategory.Unbound:
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
                            type: this._serializeTypeRef(param.type, cachedTypes)
                        };
                    }),
                    declaredReturnType: returnType ?
                        this._serializeTypeRef(returnType, cachedTypes) :
                        undefined,
                    inferredReturnType: this._serializeTypeRef(
                        functionType.getInferredReturnType().getType(), cachedTypes),
                    inferredYieldType: this._serializeTypeRef(
                        functionType.getInferredYieldType().getType(), cachedTypes),
                    builtInName: functionType.getBuiltInName(),
                    docString: functionType.getDocString(),
                    specializedParameterTypes: specializedTypes ?
                        specializedTypes.parameterTypes.map(t => this._serializeTypeRef(t, cachedTypes)) :
                        undefined,
                    specializedReturnType: specializedTypes ?
                        this._serializeTypeRef(specializedTypes.returnType, cachedTypes) :
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
                            type: this._serializeTypeRef(overload.type, cachedTypes),
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
                    getter: this._serializeTypeRef(propertyType.getGetter(), cachedTypes),
                    setter: setter ? this._serializeTypeRef(setter, cachedTypes) : undefined,
                    deleter: deleter ? this._serializeTypeRef(deleter, cachedTypes) : undefined
                };

                cachedType = cachedPropertyType;
                break;
            }

            case TypeCategory.Class: {
                const classType = type as ClassType;
                const aliasClass = classType.getAliasClass();
                const typeArgs = classType.getTypeArguments();

                const cachedClassType: CachedClassType = {
                    category: TypeCategory.Class,
                    name: classType.getClassName(),
                    flags: classType.getClassFlags(),
                    typeSourceId: classType.getTypeSourceId(),
                    baseClasses: classType.getBaseClasses().map(baseClass => {
                        return {
                            type: this._serializeTypeRef(baseClass.type, cachedTypes),
                            isMetaclass: baseClass.isMetaclass
                        };
                    }),
                    aliasClass: aliasClass ?
                        this._serializeTypeRef(aliasClass, cachedTypes) :
                        undefined,
                    classFields: this._serializeSymbolTable(classType.getClassFields(), cachedTypes),
                    instanceFields: this._serializeSymbolTable(classType.getInstanceFields(), cachedTypes),
                    typeParameters: classType.getTypeParameters().map(t => {
                        return this._serializeTypeRef(t, cachedTypes);
                    }),
                    isAbstractClass: classType.isAbstractClass(),
                    docString: classType.getDocString(),
                    typeArguments: typeArgs ?
                        typeArgs.map(t => this._serializeTypeRef(t, cachedTypes)) :
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
                    classType: this._serializeTypeRef(objectType.getClassType(), cachedTypes),
                    literalValue: objectType.getLiteralValue()
                };

                cachedType = cachedObjectType;
                break;
            }

            case TypeCategory.Module: {
                const moduleType = type as ModuleType;

                const cachedModuleType: CachedModuleType = {
                    category: TypeCategory.Module,
                    fields: this._serializeSymbolTable(moduleType.getFields(), cachedTypes)

                };

                cachedType = cachedModuleType;
                break;
            }

            case TypeCategory.Union: {
                const unionType = type as UnionType;

                const cachedUnionType: CachedUnionType = {
                    category: TypeCategory.Union,
                    types: unionType.getTypes().map(t =>
                        this._serializeTypeRef(t, cachedTypes))
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
                        this._serializeTypeRef(t, cachedTypes)),
                    boundType: boundType ?
                        this._serializeTypeRef(boundType, cachedTypes) :
                        undefined,
                    isCovariant: typeVarType.isCovariant(),
                    isContravariant: typeVarType.isContravariant()
                };

                cachedType = cachedTypeVarType;
                break;
            }
        }

        return cachedType;
    }

    private _serializeDeclaration(declaration: Declaration, cachedTypes: CachedTypeMap): CachedDeclaration {
        const cachedDecl: CachedDeclaration = {
            category: declaration.category,
            typeSourceId: declaration.typeSourceId,
            declaredType: declaration.declaredType ?
                this._serializeTypeRef(declaration.declaredType, cachedTypes) :
                undefined,
            isConstant: declaration.isConstant,
            path: declaration.path,
            range: declaration.range
        };

        return cachedDecl;
    }

    private _serializeDiagnostic(diag: Diagnostic): CachedDiagnostic {
        const cachedDiag: CachedDiagnostic = {
            category: diag.category,
            message: diag.message,
            range: diag.range,
            actions: diag.getActions()
        };

        return cachedDiag;
    }
}
