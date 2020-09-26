/// <reference path="fourslash.ts" />

// @filename: sem.py
//// [|/*marker*/|]from [|enum|] import [|Enum|]
//// class [|Color|]([|Enum|]):
////     [|RED|] = 1
////     [|GREEN|] = 2
//// [|var1|] = [|Color|].[|RED|]

helper.verifySemanticTokens([
    {
        fileOrStartMarker: 'marker',
        tokens: [
            { type: 'module' },
            { type: 'enum' },
            { type: 'enum', modifiers: ['declaration'] },
            { type: 'enum' },
            { type: 'enumMember', modifiers: ['declaration'] },
            { type: 'enumMember', modifiers: ['declaration'] },
            { type: 'variable', modifiers: ['declaration'] },
            { type: 'enum' },
            { type: 'enumMember' },
        ],
    },
]);
