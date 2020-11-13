/// <reference path="fourslash.ts" />

// @filename: mspythonconfig.json
//// {
////   "completeFunctionParens": true
//// }

// @filename: test.py
//// from os.path import joi[|/*marker*/|]

// @ts-ignore
await helper.verifyCompletion('included', 'markdown', {
    marker: {
        completions: [
            {
                label: 'join',
                kind: Consts.CompletionItemKind.Function,
                insertionText: undefined,
            },
        ],
    },
});
