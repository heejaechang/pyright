/// <reference path="fourslash.ts" />

// @filename: sem.py
//// [|/*marker*/|]
//// [|msg|] = 'hello'
//// raise [|Exception|]()
//// print(msg)
helper.verifySemanticTokens([
    {
        fileOrStartMarker: 'marker',
        tokens: [
            { type: 'variable', modifiers: ['declaration'] },
            { type: 'class', modifiers: ['builtin'] },
        ],
    },
]);
