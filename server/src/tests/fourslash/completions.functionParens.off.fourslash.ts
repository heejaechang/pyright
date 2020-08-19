/// <reference path="../../../pyright/server/src/tests/fourslash/fourslash.ts" />

// @filename: test.py
//// prin[|/*marker*/|]

// @ts-ignore
await helper.verifyCompletion('exact', {
    marker: {
        completions: [
            {
                label: 'print',
                insertionText: undefined,
            },
        ],
    },
});
