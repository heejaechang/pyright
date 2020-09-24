/// <reference path="fourslash.ts" />

// @filename: sem.py
//// [|/*marker*/|]
//// [|msg|] = 'hello'
//// raise [|Exception|]()
//// print(msg)
helper.verifySemanticTokens([
    {
        fileOrStartMarker: 'marker',
        tokens: [{ type: 'variable' }, { type: 'class' }],
    },
]);
