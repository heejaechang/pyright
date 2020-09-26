/// <reference path="fourslash.ts" />

// @filename: sem.py
//// [|/*marker*/|]
//// [|var_one|] = 0
//// [|CONSTANT_ONE|] = 0

helper.verifySemanticTokens([
    {
        fileOrStartMarker: 'marker',
        tokens: [
            { type: 'variable', modifiers: ['declaration'] },
            { type: 'variable', modifiers: ['readonly', 'declaration'] },
        ],
    },
]);
