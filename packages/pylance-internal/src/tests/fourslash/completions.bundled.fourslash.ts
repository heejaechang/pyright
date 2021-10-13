/// <reference path="fourslash.ts" />

// @filename: test.py
//// from p/*marker*/

// @ts-ignore
await helper.verifyCompletion('included', 'markdown', {
    marker: { completions: [{ label: 'pandas', kind: Consts.CompletionItemKind.Module }] },
});
