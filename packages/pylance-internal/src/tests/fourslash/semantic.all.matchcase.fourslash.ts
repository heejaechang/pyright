/// <reference path="fourslash.ts" />

// @filename: matchcase.py
//// [|/*marker*/|]def [|http_error|]([|status|]: [|int|]):
////     [|match|] [|status|]:
////         [|case|] 400:
////             return "Bad request"
////         [|case|] 404:
////             return "Not found"
////         [|case|] 418:
////             return "I'm a teapot"

// @filename: pyrightconfig.json
//// {
////   "pythonVersion": "3.10"
//// }

helper.verifySemanticTokens([
    {
        fileOrStartMarker: 'marker',
        tokens: [
            { type: 'function', modifiers: ['declaration'] },
            { type: 'parameter', modifiers: ['declaration'] },
            { type: 'class', modifiers: ['builtin', 'typeHint'] },
            { type: 'keyword' },
            { type: 'parameter' },
            { type: 'keyword' },
            { type: 'keyword' },
            { type: 'keyword' },
        ],
    },
]);
