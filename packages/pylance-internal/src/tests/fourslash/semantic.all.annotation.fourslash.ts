/// <reference path="fourslash.ts" />

// @filename: sem.py
//// [|/*marker*/|]
//// from [|typing|] import [|ClassVar|], [|Dict|], [|List|]
//// import [|typing|]
////
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
////
//// [|more_var|]: [|ClassVar|][[|Dict|][[|str|], [|typing|].[|Type|][[|MyClass|]]]] = {}
////
//// def [|more_func|]([|nums|]: [|List|][[|int|]]):
////     pass

helper.verifySemanticTokens([
    {
        fileOrStartMarker: 'marker',
        tokens: [
            { type: 'module' },
            { type: 'class' },
            { type: 'variable' },
            { type: 'variable' },
            { type: 'module' },
            // MyClass
            { type: 'class', modifiers: ['declaration'] },
            // my_var
            { type: 'variable', modifiers: ['declaration'] },
            { type: 'class', modifiers: ['typeHintComment', 'builtin'] },
            // my_func
            { type: 'function', modifiers: ['declaration'] },
            { type: 'parameter', modifiers: ['declaration'] },
            { type: 'parameter', modifiers: ['declaration'] },
            { type: 'class', modifiers: ['typeHintComment', 'builtin'] },
            { type: 'class', modifiers: ['typeHintComment', 'builtin'] },
            { type: 'class', modifiers: ['typeHintComment'] },
            { type: 'class' },
            // other_var
            { type: 'variable', modifiers: ['declaration'] },
            { type: 'class', modifiers: ['typeHint', 'builtin'] },
            // other_func
            { type: 'function', modifiers: ['declaration'] },
            { type: 'parameter', modifiers: ['declaration'] },
            { type: 'class', modifiers: ['typeHint', 'builtin'] },
            { type: 'parameter', modifiers: ['declaration'] },
            { type: 'class', modifiers: ['typeHint', 'builtin'] },
            { type: 'class', modifiers: ['typeHint'] },
            { type: 'class' },
            // more_var
            { type: 'variable', modifiers: ['declaration'] },
            { type: 'class', modifiers: ['typeHint'] },
            { type: 'variable', modifiers: ['typeHint'] },
            { type: 'class', modifiers: ['typeHint', 'builtin'] },
            { type: 'module', modifiers: ['typeHint'] },
            { type: 'class', modifiers: ['typeHint'] },
            { type: 'class', modifiers: ['typeHint'] },
            // more_func
            { type: 'function', modifiers: ['declaration'] },
            { type: 'parameter', modifiers: ['declaration'] },
            { type: 'variable', modifiers: ['typeHint'] },
            { type: 'class', modifiers: ['typeHint', 'builtin'] },
        ],
    },
]);
