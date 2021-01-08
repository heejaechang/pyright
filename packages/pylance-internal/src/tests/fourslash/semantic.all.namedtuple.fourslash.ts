/// <reference path="fourslash.ts" />

// @filename: semNamedTuple.py
////[|/*marker*/|]from [|typing|] import [|List|], [|NamedTuple|]
////[|VertData|] = [|NamedTuple|]("VertData", [('vertices', [|List|][[|int|]])])
////[|s|] = [|VertData|]([0])
////[|s|].[|vertices|]

helper.verifySemanticTokens([
    {
        fileOrStartMarker: 'marker',
        tokens: [
            { type: 'module' },
            { type: 'variable' },
            { type: 'class' },
            { type: 'variable', modifiers: ['declaration'] },
            { type: 'class' },
            { type: 'variable' },
            { type: 'class', modifiers: ['builtin'] },
            { type: 'variable', modifiers: ['declaration'] },
            { type: 'variable' },
            { type: 'variable' },
            { type: 'property' },
        ],
    },
]);
