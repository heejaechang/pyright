/// <reference path="fourslash.ts" />

// @filename: test1.py
//// test[|/*marker*/|]

// @filename: test2.py
//// import testLib
//// import testLib.test1
//// import testLib.test2
//// a = testLib.test1.Test1()
//// b = testLib.test2.Test2()

// @filename: testLib/__init__.pyi
// @library: true
//// class Test:
////     pass

// @filename: testLib/test1.pyi
// @library: true
//// class Test1:
////     pass

// @filename: testLib/test2.pyi
// @library: true
//// class Test2:
////     pass

// @ts-ignore
await helper.verifyCompletion('included', 'markdown', {
    marker: {
        completions: [
            {
                label: 'test1',
                documentation: '```\nfrom testLib import test1\n```',
                detail: 'Auto-import',
            },
        ],
    },
});
