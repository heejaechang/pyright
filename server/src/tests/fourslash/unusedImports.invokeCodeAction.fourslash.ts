/// <reference path="../../../pyright/server/src/tests/fourslash/fourslash.ts" />
// @asynctest: true

// @filename: mspythonconfig.json
//// {
////   "reportUnusedImport": true
//// }

// @filename: testLib1/__init__.py
// @library: true
//// class Test1:
////     pass
//// class Test1_1:
////     pass

// @filename: testLib2/__init__.py
// @library: true
//// class Test2:
////     pass

// @filename: test.py
//// [|/*result1*/import testLib1 as [|/*marker1*/tl|]
//// |][|/*result2*/import testLib2 as [|/*marker2*/t2|]|]

{
    const result1 = helper.getPositionRange('result1');
    const result2 = helper.getPositionRange('result2');
    helper.verifyInvokeCodeAction({
        marker1: { title: 'Remove unused import', edits: [{ range: result1, newText: '' }] },
        marker2: { title: 'Remove unused import', edits: [{ range: result2, newText: '' }] },
    });
}
