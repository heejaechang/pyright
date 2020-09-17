/// <reference path="fourslash.ts" />

// @filename: sem1.py
//// [|/*sem1*/|]
//// from [|package1|].[|module1|] import [|func1|]

// @filename: sem2.py
//// [|/*sem2*/|]
//// from .[|package1|].[|module1|] import [|func1|]

// @filename: sem3.py
//// [|/*sem3*/|]
//// from [|package1|] import [|module1|]

// @filename: sem4.py
//// [|/*sem4*/|]
//// from .[|package1|] import [|module1|]

// @filename: sem5.py
//// [|/*sem5*/|]
//// from package1.not_exist import func_not_exist
//// from .package1.not_exist import func_not_exist

// @filename: package1/__init__.py
//// # empty

// @filename: package1/module1.py
//// def func1():
////     pass

helper.verifySemanticTokens([
    {
        fileOrStartMarker: 'sem1',
        tokens: [{ type: 'module' }, { type: 'module' }, { type: 'function' }],
    },
    {
        fileOrStartMarker: 'sem2',
        tokens: [{ type: 'module' }, { type: 'module' }, { type: 'function' }],
    },
    {
        fileOrStartMarker: 'sem3',
        tokens: [{ type: 'module' }, { type: 'module' }],
    },
    {
        fileOrStartMarker: 'sem4',
        tokens: [{ type: 'module' }, { type: 'module' }],
    },
    {
        fileOrStartMarker: 'sem5',
        tokens: [],
    },
]);
