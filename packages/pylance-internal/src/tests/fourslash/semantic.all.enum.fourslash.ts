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
            { type: 'enum' },
            { type: 'enum' },
            { type: 'enumMember' },
            { type: 'enumMember' },
            { type: 'variable' },
            { type: 'enum' },
            { type: 'enumMember' },
        ],
    },
]);
