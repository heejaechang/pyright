/// <reference path="fourslash.ts" />

// @filename: sem.py
//// [|/*marker*/|]
//// class [|MyClass|]:
////     pass
////
//// [|my_var|] = 0 # type: [|int|]
////
//// def [|my_func|]([|a|], [|b|]): # type: ([|int|], [|str|]) -> [|MyClass|]
////     return [|MyClass|]()
////
//// [|other_var|]: [|int|] = 0
////
//// def [|other_func|]([|a|]: [|int|], [|b|]: [|str|]) -> [|MyClass|]:
////     return [|MyClass|]()

helper.verifySemanticTokens([
    {
        fileOrStartMarker: 'marker',
        tokens: [
            { type: 'class' },
            { type: 'variable' },
            { type: 'class', modifiers: ['typeHintComment'] },
            { type: 'function' },
            { type: 'parameter' },
            { type: 'parameter' },
            { type: 'class', modifiers: ['typeHintComment'] },
            { type: 'class', modifiers: ['typeHintComment'] },
            { type: 'class', modifiers: ['typeHintComment'] },
            { type: 'class' },
            { type: 'variable' },
            { type: 'class', modifiers: ['typeHint'] },
            { type: 'function' },
            { type: 'parameter' },
            { type: 'class', modifiers: ['typeHint'] },
            { type: 'parameter' },
            { type: 'class', modifiers: ['typeHint'] },
            { type: 'class', modifiers: ['typeHint'] },
            { type: 'class' },
        ],
    },
]);
