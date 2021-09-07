/// <reference path="fourslash.ts" />

// @filename: sem.py
//// [|/*marker*/|]
//// [|var_one|] = 0
//// [|CONSTANT_ONE|] = 0
//// [|__package__|] = 0
//// [|__nonbuiltinduner__|] = 0

helper.verifySemanticTokens([
    {
        fileOrStartMarker: 'marker',
        tokens: [
            { type: 'variable', modifiers: ['declaration'] },
            { type: 'variable', modifiers: ['readonly', 'declaration'] },
            { type: 'variable', modifiers: ['builtin'] },
            { type: 'variable', modifiers: ['declaration'] },
        ],
    },
]);
