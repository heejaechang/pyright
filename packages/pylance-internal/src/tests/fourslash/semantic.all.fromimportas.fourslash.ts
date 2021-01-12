/// <reference path="fourslash.ts" />

// @filename: sem1.py
//// [|/*sem1*/|]
//// from [|package1|] import [|module1|] as [|mod1|]

// @filename: sem2.py
//// [|/*sem2*/|]
//// from .[|package1|] import [|module1|] as [|mod1|]

// @filename: sem3.py
//// [|/*sem3*/|]
//// from [|package1|] import [|MyClass|] as [|mc|]

// @filename: sem4.py
//// [|/*sem4*/|]
//// from .[|package1|] import [|MyClass|] as [|mc|]

// @filename: sem5.py
//// [|/*sem5*/|]
//// from [|package1|] import not_exist1 as ne1
//// from .[|package1|].not_exist import not_exist2 as ne2

// @filename: package1/__init__.py
//// class MyClass:
////     pass

// @filename: package1/module1.py
//// def func1():
////     pass

helper.verifySemanticTokens([
    {
        fileOrStartMarker: 'sem1',
        tokens: [{ type: 'module' }, { type: 'module' }, { type: 'module' }],
    },
    {
        fileOrStartMarker: 'sem2',
        tokens: [{ type: 'module' }, { type: 'module' }, { type: 'module' }],
    },
    {
        fileOrStartMarker: 'sem3',
        tokens: [{ type: 'module' }, { type: 'class' }, { type: 'class' }],
    },
    {
        fileOrStartMarker: 'sem4',
        tokens: [{ type: 'module' }, { type: 'class' }, { type: 'class' }],
    },
    {
        fileOrStartMarker: 'sem5',
        tokens: [{ type: 'module' }, { type: 'module' }],
    },
]);
