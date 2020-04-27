/// <reference path="../../../pyright/server/src/tests/fourslash/fourslash.ts" />

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
//// import testLib1 as tl1[|/*result1*/, testLib2 as [|/*marker1*/tl2|]|]
//// import [|/*result2*/[|/*marker2*/testLib1|], |]testLib2
//// from testLib1 import Test1[|/*result3*/, [|/*marker3*/Test1_1|]|]
//// from testLib1 import [|/*result4*/Test1 as [|/*marker4*/t1|], |]Test1_1 as t11
////
//// a = tl1.Test1()
//// b = testLib2.Test2()
//// c = Test1()
//// d = t11()

{
    const result1 = helper.getPositionRange('result1');
    const result2 = helper.getPositionRange('result2');
    const result3 = helper.getPositionRange('result3');
    const result4 = helper.getPositionRange('result4');
    helper.verifyInvokeCodeAction({
        marker1: { title: 'Remove unused import', edits: [{ range: result1, newText: '' }] },
        marker2: { title: 'Remove unused import', edits: [{ range: result2, newText: '' }] },
        marker3: { title: 'Remove unused import', edits: [{ range: result3, newText: '' }] },
        marker4: { title: 'Remove unused import', edits: [{ range: result4, newText: '' }] },
    });
}
