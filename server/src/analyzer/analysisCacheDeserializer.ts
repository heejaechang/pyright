/*
* analysisCacheDeserializer.ts
* Copyright (c) Microsoft Corporation.
* Licensed under the MIT license.
* Author: Eric Traut
*
* Logic that deserializes the type information for a source file from
* a "document" that was persisted to a JSON file.
*/

import * as assert from 'assert';

import { Diagnostic } from '../common/diagnostic';
import { AnalysisCacheDoc, CachedClassType, CachedDeclaration,
    CachedDiagnostic, CachedFunctionType, CachedModuleType, CachedObjectType,
    CachedOverloadedFunctionType, CachedPropertyType, CachedSymbol,
    CachedSymbolTable, CachedType, CachedTypeMap, CachedTypeRef,
    CachedTypeVarType, CachedUnionType, currentCacheDocVersion
    } from './analysisCacheDoc';
import { Declaration } from './declaration';
import { defaultTypeSourceId } from './inferredType';
import { Symbol, SymbolTable } from './symbol';
import { AnyType, ClassType, EllipsisType, FunctionType, ModuleType,
    NeverType, NoneType, ObjectType, OverloadedFunctionType, PropertyType,
    Type, TypeCategory, TypeVarType, UnboundType, UnionType,
    UnknownType } from './types';

export type TypeMap = { [id: number]: Type };
export type ResolveModuleTypeCallback = (filePath: string) => ModuleType;
export type ResolveClassTypeCallback = (filePath: string, typeSourceId: string) => ClassType;

export interface DeserializedInfo {
    diagnostics: Diagnostic[];
    primaryModuleType: ModuleType;
    deserializedTypeMap: TypeMap;
}

export class AnalysisCacheDeserializer {
    // Validates that the cache document contents are correct. Throws an
    // exception if not.
    validateDocument(doc: AnalysisCacheDoc, sourceFilePath: string, optionsString: string,
            fileContentsHash: number) {

        if (doc.cacheVersion !== currentCacheDocVersion) {
            throw new Error('Wrong cache version');
        }

        if (doc.filePath !== sourceFilePath) {
            throw new Error('Wrong file path');
        }

        if (doc.optionsString !== optionsString) {
            throw new Error('Wrong options string');
        }

        if (doc.fileContentsHash !== fileContentsHash) {
            throw new Error('Mismatch file contents');
        }
    }

    // Performs a first pass of deserialization. During this pass,
    // type and declaration objects are created but not fully populated
    // with other type references. References between types will be
    // filled in during the second pass. This two-pass process is
    // required to handle circular dependencies both within files
    // and across files.
    deserializeFirstPass(doc: AnalysisCacheDoc): DeserializedInfo {
        const deserializedTypeMap = this._deserializeTypesFirstPass(
                doc.types, doc.filePath);
        const primaryModuleType = deserializedTypeMap[
            doc.primaryModuleType.localTypeId] as ModuleType;

        if (!(primaryModuleType instanceof ModuleType)) {
            throw new Error('Primary module type does not refer to ModuleType');
        }

        const deserializedInfo: DeserializedInfo = {
            diagnostics: doc.diagnostics.map(diag => this._deserializeDiagnostic(diag)),
            primaryModuleType,
            deserializedTypeMap
        };

        return deserializedInfo;
    }

    // Performs a second pass of deserialization. During this pass,
    // type and declaration objects are filled in completely.
    deserializeSecondPass(doc: AnalysisCacheDoc, info: DeserializedInfo,
            resolveModuleCallback: ResolveModuleTypeCallback,
            resolveClassCallback: ResolveClassTypeCallback) {

        this._deserializeTypesSecondPass(doc, info,
            resolveModuleCallback, resolveClassCallback);
    }

    private _deserializeDiagnostic(cachedDiag: CachedDiagnostic): Diagnostic {
        return new Diagnostic(cachedDiag.category, cachedDiag.message,
            cachedDiag.range);
    }

    private _deserializeTypesFirstPass(cachedTypeMap: CachedTypeMap,
            sourceFilePath: string): TypeMap {

        const typeMap: TypeMap = {};

        Object.keys(cachedTypeMap).forEach(key => {
            const typeId = parseInt(key, 10);
            const cachedType = cachedTypeMap[typeId];
            let type: Type;

            switch (cachedType.category) {
                case TypeCategory.Unbound: {
                    type = UnboundType.create();
                    break;
                }

                case TypeCategory.Unknown: {
                    type = UnknownType.create();
                    break;
                }

                case TypeCategory.Any: {
                    type = AnyType.create();
                    break;
                }

                case TypeCategory.Ellipsis: {
                    type = EllipsisType.create();
                    break;
                }

                case TypeCategory.None: {
                    type = NoneType.create();
                    break;
                }

                case TypeCategory.Never: {
                    type = NeverType.create();
                    break;
                }

                case TypeCategory.Function: {
                    const cachedFunctionType = cachedType as CachedFunctionType;
                    type = new FunctionType(cachedFunctionType.flags, cachedFunctionType.docString);
                    break;
                }

                case TypeCategory.OverloadedFunction: {
                    type = new OverloadedFunctionType();
                    break;
                }

                case TypeCategory.Property: {
                    // Use a dummy getter for now. We'll fill in the proper
                    // type in the second pass.
                    const dummyGetter = new FunctionType(0);
                    type = new PropertyType(dummyGetter);
                    break;
                }

                case TypeCategory.Class: {
                    const cachedClassType = cachedType as CachedClassType;
                    type = new ClassType(sourceFilePath, cachedClassType.name,
                        cachedClassType.flags, cachedClassType.typeSourceId,
                        cachedClassType.docString);
                    break;
                }

                case TypeCategory.Object: {
                    const cachedObjectType = cachedType as CachedObjectType;

                    // Create a dummy class for now. We'll replace it
                    // with the real class in the second pass.
                    const dummyClass = new ClassType('', '', 0, '');
                    let newObjectType = new ObjectType(dummyClass);
                    if (cachedObjectType.literalValue !== undefined) {
                        newObjectType = newObjectType.cloneWithLiteral(
                            cachedObjectType.literalValue);
                    }

                    type = newObjectType;
                    break;
                }

                case TypeCategory.Module: {
                    const cachedModuleType = cachedType as CachedModuleType;
                    type = new ModuleType(sourceFilePath, new SymbolTable(),
                        cachedModuleType.docString);
                    break;
                }

                case TypeCategory.Union: {
                    type = new UnionType();
                    break;
                }

                case TypeCategory.TypeVar: {
                    const cachedTypeVarType = cachedType as CachedTypeVarType;
                    type = new TypeVarType(cachedTypeVarType.name);
                    break;
                }

                default: {
                    throw new Error('Unknown type category');
                }
            }

            typeMap[typeId] = type;
        });

        return typeMap;
    }

    private _deserializeTypesSecondPass(doc: AnalysisCacheDoc,
            info: DeserializedInfo,
            resolveModuleCallback: ResolveModuleTypeCallback,
            resolveClassCallback: ResolveClassTypeCallback) {

        Object.keys(doc.types).forEach(key => {
            const typeId = parseInt(key, 10);
            const cachedType = doc.types[typeId];
            const type = info.deserializedTypeMap[typeId];

            if (type === undefined) {
                throw new Error('Missing type from type map');
            }

            switch (cachedType.category) {
                case TypeCategory.Unbound:
                case TypeCategory.Unknown:
                case TypeCategory.Any:
                case TypeCategory.Ellipsis:
                case TypeCategory.None:
                case TypeCategory.Never: {
                    // These types were already handled in their
                    // entirety during the first pass.
                    break;
                }

                case TypeCategory.Function: {
                    const cachedFunctionType = cachedType as CachedFunctionType;
                    const functionType = doc.types[typeId] as FunctionType;

                    cachedFunctionType.parameters.forEach(cachedParam => {
                        functionType.addParameter({
                            category: cachedParam.category,
                            name: cachedParam.name,
                            hasDefault: cachedParam.hasDefault,
                            type: this._getType(cachedParam.type,
                                info.deserializedTypeMap,
                                resolveModuleCallback,
                                resolveClassCallback)
                        });
                    });
                    break;
                }

                case TypeCategory.OverloadedFunction: {
                    const cachedFunctionType = cachedType as CachedOverloadedFunctionType;
                    const overloadedFunctionType = doc.types[typeId] as OverloadedFunctionType;

                    cachedFunctionType.overloads.forEach(overload => {
                        overloadedFunctionType.addOverload(
                            overload.typeSourceId,
                            this._getType(overload.type, info.deserializedTypeMap) as FunctionType
                        );
                    });
                    break;
                }

                case TypeCategory.Property: {
                    const cachedPropertyType = cachedType as CachedPropertyType;
                    const propertyType = doc.types[typeId] as PropertyType;

                    propertyType.setGetter(
                        this._getType(cachedPropertyType.getter, info.deserializedTypeMap) as FunctionType
                    );

                    if (cachedPropertyType.setter) {
                        propertyType.setSetter(
                            this._getType(cachedPropertyType.setter, info.deserializedTypeMap) as FunctionType
                        );
                    }

                    if (cachedPropertyType.deleter) {
                        propertyType.setDeleter(
                            this._getType(cachedPropertyType.deleter, info.deserializedTypeMap) as FunctionType
                        );
                    }
                    break;
                }

                case TypeCategory.Class: {
                    const cachedClassType = cachedType as CachedClassType;
                    const classType = doc.types[typeId] as ClassType;

                    cachedClassType.baseClasses.forEach(baseClass => {
                        classType.addBaseClass(
                            this._getType(baseClass.type, info.deserializedTypeMap,
                                resolveModuleCallback, resolveClassCallback),
                            !!baseClass.isMetaclass
                        );
                    });

                    if (cachedClassType.aliasClass) {
                        classType.setAliasClass(
                            this._getType(cachedClassType.aliasClass, info.deserializedTypeMap,
                                resolveModuleCallback, resolveClassCallback) as ClassType
                        );
                    }

                    classType.setClassFields(
                        this._deserializeSymbolTable(
                            cachedClassType.classFields, doc, info,
                            resolveModuleCallback, resolveClassCallback)
                    );

                    classType.setInstanceFields(
                        this._deserializeSymbolTable(
                            cachedClassType.instanceFields, doc, info,
                            resolveModuleCallback, resolveClassCallback)
                    );

                    if (cachedClassType.typeParameters.length > 0) {
                        classType.setTypeParameters(
                            cachedClassType.typeParameters.map(typeParam => {
                                return this._getType(typeParam, info.deserializedTypeMap,
                                    resolveModuleCallback, resolveClassCallback) as TypeVarType;
                            })
                        );
                    }

                    if (cachedClassType.isAbstractClass) {
                        classType.setIsAbstractClass();
                    }

                    if (cachedClassType.typeArguments) {
                        classType.setTypeArguments(
                            cachedClassType.typeArguments.map(typeArg => {
                                return this._getType(typeArg, info.deserializedTypeMap,
                                    resolveModuleCallback, resolveClassCallback);
                            })
                        );
                    }

                    if (cachedClassType.skipAbstractClassTest) {
                        classType.setSkipAbstracClassTest();
                    }
                    break;
                }

                case TypeCategory.Object: {
                    const cachedObjectType = cachedType as CachedObjectType;
                    const objectType = doc.types[typeId] as ObjectType;

                    objectType.setClassType(
                        this._getType(cachedObjectType.classType, info.deserializedTypeMap,
                            undefined, resolveClassCallback) as ClassType
                    );
                    break;
                }

                case TypeCategory.Module: {
                    const cachedModuleType = cachedType as CachedModuleType;
                    const moduleType = doc.types[typeId] as ModuleType;

                    moduleType.setFields(this._deserializeSymbolTable(
                        cachedModuleType.fields, doc, info,
                        resolveModuleCallback, resolveClassCallback));

                    if (cachedModuleType.isPartialModule) {
                        moduleType.setIsPartialModule();
                    }
                    break;
                }

                case TypeCategory.Union: {
                    const cachedUnionType = cachedType as CachedUnionType;
                    const unionType = doc.types[typeId] as UnionType;

                    const types = cachedUnionType.types.map(type => {
                        return this._getType(type, info.deserializedTypeMap,
                            resolveModuleCallback, resolveClassCallback);
                    });
                    unionType.addTypes(types);
                    break;
                }

                case TypeCategory.TypeVar: {
                    const cachedTypeVarType = cachedType as CachedTypeVarType;
                    const typeVarType = doc.types[typeId] as TypeVarType;

                    cachedTypeVarType.constraints.forEach(constraint => {
                        typeVarType.addConstraint(
                            this._getType(constraint, info.deserializedTypeMap,
                                resolveModuleCallback, resolveClassCallback)
                        );
                    });

                    if (cachedTypeVarType.boundType) {
                        typeVarType.setBoundType(
                            this._getType(cachedTypeVarType.boundType,
                                info.deserializedTypeMap,
                                resolveModuleCallback, resolveClassCallback)
                        );
                    }

                    if (cachedTypeVarType.isCovariant) {
                        typeVarType.setIsCovariant();
                    }

                    if (cachedTypeVarType.isContravariant) {
                        typeVarType.setIsContravariant();
                    }
                    break;
                }
            }
        });
    }

    private _deserializeSymbolTable(cachedSymbolTable: CachedSymbolTable,
            doc: AnalysisCacheDoc,
            info: DeserializedInfo,
            resolveModuleCallback: ResolveModuleTypeCallback,
            resolveClassCallback: ResolveClassTypeCallback): SymbolTable {

        const symbolTable = new SymbolTable();

        Object.keys(cachedSymbolTable).forEach(name => {
            const cachedSymbol = cachedSymbolTable[name];

            symbolTable.set(name, this._deserializeSymbol(cachedSymbol,
                info.deserializedTypeMap, resolveModuleCallback,
                resolveClassCallback));
        });

        return symbolTable;
    }

    private _deserializeSymbol(cachedSymbol: CachedSymbol,
        typeMap: TypeMap,
        resolveModuleCallback: ResolveModuleTypeCallback,
        resolveClassCallback: ResolveClassTypeCallback): Symbol {

        const newSymbol = new Symbol(cachedSymbol.isInitiallyUnbound);

        const inferredType = this._getType(cachedSymbol.inferredType,
            typeMap, resolveModuleCallback, resolveClassCallback);
        newSymbol.setInferredTypeForSource(inferredType, defaultTypeSourceId);

        cachedSymbol.declarations.forEach(decl => {
            newSymbol.addDeclaration(this._decodeDeclaration(decl,
                typeMap, resolveModuleCallback, resolveClassCallback));
        });

        newSymbol.setIsExternallyHidden(!!cachedSymbol.isExternallyHidden);

        if (cachedSymbol.isAccessed) {
            newSymbol.setIsAcccessed();
        }

        return newSymbol;
    }

    private _decodeDeclaration(cachedDecl: CachedDeclaration, typeMap: TypeMap,
            resolveModuleCallback: ResolveModuleTypeCallback,
            resolveClassCallback: ResolveClassTypeCallback): Declaration {

        const newDecl: Declaration = {
            category: cachedDecl.category,
            typeSourceId: cachedDecl.typeSourceId,
            isConstant: cachedDecl.isConstant,
            path: cachedDecl.path,
            range: cachedDecl.range
        };

        if (cachedDecl.declaredType) {
            newDecl.declaredType = this._getType(cachedDecl.declaredType,
                typeMap, resolveModuleCallback, resolveClassCallback);
        }

        return newDecl;
    }

    private _getType(cachedTypeRef: CachedTypeRef, typeMap: TypeMap,
            resolveModuleCallback?: ResolveModuleTypeCallback,
            resolveClassCallback?: ResolveClassTypeCallback) {

        // Is it a remote type?
        if (cachedTypeRef.remoteTypeCategory !== undefined) {
            if (!cachedTypeRef.remotePath) {
                throw new Error('Invalid remote path');
            }

            switch (cachedTypeRef.remoteTypeCategory) {
                case TypeCategory.Module: {
                    if (!resolveModuleCallback) {
                        throw new Error('Missing resolve module callback');
                    }
                    return resolveModuleCallback(cachedTypeRef.remotePath);
                }

                case TypeCategory.Class: {
                    if (!cachedTypeRef.remoteTypeSourceId) {
                        throw new Error('Invalid remote type source ID');
                    }

                    if (!resolveClassCallback) {
                        throw new Error('Missing resolve class callback');
                    }

                    return resolveClassCallback(cachedTypeRef.remotePath,
                        cachedTypeRef.remoteTypeSourceId);
                }

                default: {
                    throw new Error('Unexpected remote type category');
                }
            }
        }

        // Assume it's a local type.
        const localType = typeMap[cachedTypeRef.localTypeId];
        if (!localType) {
            throw new Error('Invalid local type reference');
        }

        return localType;
    }
}
