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
await helper.verifyCompletion('included', {
    marker: {
        completions: [
            {
                label: 'Test',
                documentation: {
                    kind: 'markdown',
                    value: 'Auto-import\n\n```\nfrom testLib import Test\n```',
                },
            },
        ],
    },
});
