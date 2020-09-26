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
            { type: 'class', modifiers: ['declaration'] },
            { type: 'variable', modifiers: ['declaration'] },
            { type: 'class', modifiers: ['typeHintComment'] },
            { type: 'function', modifiers: ['declaration'] },
            { type: 'parameter', modifiers: ['declaration'] },
            { type: 'parameter', modifiers: ['declaration'] },
            { type: 'class', modifiers: ['typeHintComment'] },
            { type: 'class', modifiers: ['typeHintComment'] },
            { type: 'class', modifiers: ['typeHintComment'] },
            { type: 'class' },
            { type: 'variable', modifiers: ['declaration'] },
            { type: 'class', modifiers: ['typeHint'] },
            { type: 'function', modifiers: ['declaration'] },
            { type: 'parameter', modifiers: ['declaration'] },
            { type: 'class', modifiers: ['typeHint'] },
            { type: 'parameter', modifiers: ['declaration'] },
            { type: 'class', modifiers: ['typeHint'] },
            { type: 'class', modifiers: ['typeHint'] },
            { type: 'class' },
        ],
    },
]);
