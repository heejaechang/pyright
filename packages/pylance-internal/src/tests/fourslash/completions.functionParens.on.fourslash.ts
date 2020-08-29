/// <reference path="../../../pyright/server/src/tests/fourslash/fourslash.ts" />

// @filename: mspythonconfig.json
//// {
////   "completeFunctionParens": true
//// }

// @filename: test.py
//// prin[|/*marker*/|]

// @ts-ignore
await helper.verifyCompletion('exact', {
    marker: {
        completions: [
            {
                label: 'print',
                insertionText: 'print($0)',
            },
        ],
    },
});
