/// <reference path="fourslash.ts" />

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
