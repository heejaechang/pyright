/// <reference path="fourslash.ts" />

// @filename: sem1.py
//// [|/*sem1*/|]
//// def [|hello1|]():
////     pass
//// async def [|hello2|]():
////     pass
//// [|hello1_alias|] = [|hello1|]

// @filename: sem2.py
//// [|/*sem2*/|]
//// from [|sem1|] import [|hello1|] as [|h1|]
//// [|h1|]()

// @filename: sem3.py
//// [|/*sem3*/|]
//// from [|sem1|] import [|hello1_alias|] as [|h1a|]
//// [|h1a|]()

// @filename: sem4.py
//// [|/*sem4*/|]
//// from [|sem1|] import not_exist as ne

// @filename: sem5.py
//// [|/*sem5*/|]
//// from not_module import not_exist as ne

helper.verifySemanticTokens([
    {
        fileOrStartMarker: 'sem1',
        tokens: [
            { type: 'function', modifiers: ['declaration'] },
            { type: 'function', modifiers: ['async', 'declaration'] },
            { type: 'variable', modifiers: ['declaration'] },
            { type: 'function' },
        ],
    },
    {
        fileOrStartMarker: 'sem2',
        tokens: [{ type: 'module' }, { type: 'function' }, { type: 'function' }, { type: 'function' }],
    },
    {
        fileOrStartMarker: 'sem3',
        tokens: [{ type: 'module' }, { type: 'variable' }, { type: 'variable' }, { type: 'variable' }],
    },
    {
        fileOrStartMarker: 'sem4',
        tokens: [{ type: 'module' }],
    },
    {
        fileOrStartMarker: 'sem5',
        tokens: [],
    },
]);
