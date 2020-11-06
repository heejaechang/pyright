/// <reference path="fourslash.ts" />

// @filename: sem1.py
//// [|/*sem1*/|]
//// [|print|]('hello')
//// [|NotImplemented|]
//// raise [|Exception|]()

// Covers a few cases of builtins that aren't part of other semantic tests
helper.verifySemanticTokens([
    {
        fileOrStartMarker: 'sem1',
        tokens: [
            { type: 'function', modifiers: ['builtin'] },
            { type: 'variable', modifiers: ['builtin'] },
            { type: 'class', modifiers: ['builtin'] },
        ],
    },
]);
