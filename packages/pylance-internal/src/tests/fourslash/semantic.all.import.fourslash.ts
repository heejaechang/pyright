/// <reference path="fourslash.ts" />

// @filename: sem.py
//// [|/*marker*/|]import [|urllib|]
//// import [|urllib|].[|request|]
//// [|urllib|].[|request|].[|urlopen|]('')

helper.verifySemanticTokens([
    {
        fileOrStartMarker: 'marker',
        tokens: [
            { type: 'module' },
            { type: 'module' },
            { type: 'module' },
            { type: 'module' },
            { type: 'module' },
            { type: 'function' },
        ],
    },
]);
