/// <reference path="fourslash.ts" />

// @filename: sem.py
//// [|/*marker*/|]import [|urllib|]
//// import [|urllib|].[|request|]
//// [|urllib|].[|request|].[|urlopen|]('')

helper.verifySemanticTokens([
    {
        fileOrStartMarker: 'marker',
        tokens: [
            { type: 'namespace' },
            { type: 'namespace' },
            { type: 'namespace' },
            { type: 'namespace' },
            { type: 'namespace' },
            { type: 'function' },
        ],
    },
]);
