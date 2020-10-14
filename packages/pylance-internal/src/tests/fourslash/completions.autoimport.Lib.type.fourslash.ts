/// <reference path="fourslash.ts" />
// @indexerwithoutstdlib: true

// @filename: test1.py
//// Test[|/*marker*/|]

// @filename: testLib/__init__.py
// @library: true
//// class Test:
////     pass
////
//// __all__ = ['Test']

// @ts-ignore
await helper.verifyCompletion('included', 'markdown', {
    marker: {
        completions: [
            {
                label: 'Test',
                kind: Consts.CompletionItemKind.Class,
                documentation: '```\nfrom testLib import Test\n```',
                detail: 'Auto-import',
            },
        ],
    },
});
