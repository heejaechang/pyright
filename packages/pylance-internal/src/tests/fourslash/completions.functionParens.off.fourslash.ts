/// <reference path="fourslash.ts" />

// @filename: test.py
//// prin[|/*marker*/|]

// TODO: Why does 'exact' not work?

// @ts-ignore
await helper.verifyCompletion('included', {
    marker: {
        completions: [
            {
                label: 'print',
                insertionText: undefined,
            },
        ],
    },
});
