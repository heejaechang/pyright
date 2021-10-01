/// <reference path="fourslash.ts" />

// @filename: test.py
//// from typing import Literal
//// a: Literal["Hello"] = "He[|/*marker*/|]

// @ts-ignore
await helper.verifyCompletion('included', 'markdown', {
    marker: {
        completions: [
            {
                label: '"Hello"',
                kind: Consts.CompletionItemKind.Constant,
            },
        ],
    },
});
