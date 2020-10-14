/// <reference path="fourslash.ts" />

// @filename: test.py
//// prin[|/*marker*/|]

// TODO: Why does 'exact' not work?

// @ts-ignore
await helper.verifyCompletion('included', 'markdown', {
    marker: {
        completions: [
            {
                label: 'print',
                kind: Consts.CompletionItemKind.Function,
                insertionText: undefined,
            },
        ],
    },
});
