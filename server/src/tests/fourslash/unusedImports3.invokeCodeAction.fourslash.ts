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
//// class Test1_2:
////     pass

// @filename: testLib2/__init__.py
// @library: true
//// class Test2:
////     pass

// @filename: test.py
//// from testLib1 import Test1, [|/*result1*/[|/*marker1*/Test1_1|], |]Test1_2
//// from testLib1 import Test1 as t1, [|/*result2*/Test1_1 as [|/*marker2*/t11|], |]Test1_2 as t12
////
//// a = t1()
//// b = t12()
//// c = Test1()
//// d = Test1_2()

{
    const result1 = helper.getPositionRange('result1');
    const result2 = helper.getPositionRange('result2');

    // @ts-ignore
    await helper.verifyInvokeCodeAction({
        marker1: { title: 'Remove unused import', edits: [{ range: result1, newText: '' }] },
        marker2: { title: 'Remove unused import', edits: [{ range: result2, newText: '' }] },
    });
}
