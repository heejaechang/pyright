/// <reference path="fourslash.ts" />

// @filename: sem1.py
//// [|/*sem1*/|]
//// import [|json|]
//// [|result|] = [|json|].[|dumps|]({}})

// @filename: sem2.py
//// [|/*sem2*/|]
//// from [|datetime|] import [|datetime|]
//// [|datetime|].[|now|]().[|hour|]

helper.verifySemanticTokens([
    {
        fileOrStartMarker: 'sem1',
        tokens: [{ type: 'namespace' }, { type: 'variable' }, { type: 'namespace' }, { type: 'function' }],
    },
    {
        fileOrStartMarker: 'sem2',
        tokens: [
            { type: 'namespace' },
            { type: 'class' },
            { type: 'class' },
            { type: 'function' },
            { type: 'property' },
        ],
    },
]);
