/// <reference path="fourslash.ts" />

// @filename: sem1.py
//// [|/*marker*/|]
//// class [|Foo|]:
////     ...
////
//// [|int|]
////
//// class

// Covers a few cases of builtins that aren't part of other semantic tests
helper.verifySemanticTokens([
    {
        fileOrStartMarker: 'marker',
        tokens: [
            { type: 'class', modifiers: ['declaration'] },
            { type: 'class', modifiers: ['builtin'] },
        ],
    },
]);
