/// <reference path="../../../pyright/server/src/tests/fourslash/fourslash.ts" />
// @indexerwithoutstdlib: true

// @filename: test1.py
//// Test1[|/*marker*/|]

// @filename: testLib/__init__.pyi
// @library: true
//// class Test: ...

// @filename: testLib/__init__.py
// @library: true
//// class Test:
////     pass

// @filename: testLib/test1.py
// @library: true
//// class Test1:
////     pass
////
//// __all__ = ['Test1']

// @filename: testLib/test2.py
// @library: true
//// class Test2:
////     pass
////
//// __all__ = ['Test2']

// @ts-ignore
await helper.verifyCompletion('included', {
    marker: {
        completions: [
            {
                label: 'Test1',
                documentation: {
                    kind: 'markdown',
                    value: 'Auto-import\n\n```\nfrom testLib.test1 import Test1\n```',
                },
            },
        ],
    },
});
