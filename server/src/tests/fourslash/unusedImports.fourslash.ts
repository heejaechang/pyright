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
//// import testLib1 as [|/*marker1*/tl|]
//// import testLib1 as [|/*marker2*/tl1|], testLib2 as [|/*marker3*/tl2|]
//// import [|/*marker4*/testLib1|], [|/*marker5*/testLib2|]
//// from testLib2 import [|/*marker6*/Test2|]
//// from testLib1 import [|/*marker7*/Test1|], [|/*marker8*/Test1_1|]
//// from testLib1 import Test1 as [|/*marker9*/tt|]
//// from testLib1 import Test1 as [|/*marker10*/t1|], Test1_1 as [|/*marker11*/t11|]
//// from testLib1 import *

helper.verifyDiagnostics({
    marker1: { category: 'error', message: `Import "tl" is not accessed` },
    marker2: { category: 'error', message: `Import "tl1" is not accessed` },
    marker3: { category: 'error', message: `Import "tl2" is not accessed` },
    marker4: { category: 'error', message: `Import "testLib1" is not accessed` },
    marker5: { category: 'error', message: `Import "testLib2" is not accessed` },
    marker6: { category: 'error', message: `Import "Test2" is not accessed` },
    marker7: { category: 'error', message: `Import "Test1" is not accessed` },
    marker8: { category: 'error', message: `Import "Test1_1" is not accessed` },
    marker9: { category: 'error', message: `Import "tt" is not accessed` },
    marker10: { category: 'error', message: `Import "t1" is not accessed` },
    marker11: { category: 'error', message: `Import "t11" is not accessed` },
});
