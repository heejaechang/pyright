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
//// import testLib1 as tl1, testLib2 as [|/*marker3*/tl2|]
//// import [|/*marker4*/testLib1|], testLib2
//// from testLib1 import Test1, [|/*marker8*/Test1_1|]
//// from testLib1 import Test1 as [|/*marker10*/t1|], Test1_1 as t11
////
//// a = tl1.Test1()
//// b = testLib2.Test2()
//// c = Test1()
//// d = t11()

helper.verifyDiagnostics({
    marker3: { category: 'error', message: `Import "tl2" is not accessed` },
    marker4: { category: 'error', message: `Import "testLib1" is not accessed` },
    marker8: { category: 'error', message: `Import "Test1_1" is not accessed` },
    marker10: { category: 'error', message: `Import "t1" is not accessed` },
});
