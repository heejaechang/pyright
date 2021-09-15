/// <reference path="fourslash.ts" />

// @filename: sem.py
//// [|/*start*/|]
//// [|x|] = ([|str|])
////
//// def [|my_func|](
////    [|arg1|]: (
////        [|int|]
////    )
//// ): pass
helper.verifySemanticTokens([
    {
        fileOrStartMarker: 'start',
        tokens: [
            { type: 'variable', modifiers: ['declaration'] },
            { type: 'class', modifiers: ['builtin'] },
            { type: 'function', modifiers: ['declaration'] },
            { type: 'parameter', modifiers: ['declaration'] },
            { type: 'class', modifiers: ['builtin', 'typeHint'] },
        ],
    },
]);
