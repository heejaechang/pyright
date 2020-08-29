/// <reference path="../../../pyright/server/src/tests/fourslash/fourslash.ts" />

// @filename: mspythonconfig.json
//// {
////   "typeCheckingMode ": "basic"
//// }

// @filename: test1.py
//// [|/*result*/|]a = [|/*marker*/test1|]

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

{
    const resultRange = helper.getPositionRange('result');
    const markerRange = helper.getPositionRange('marker');

    // @ts-ignore
    await helper.verifyInvokeCodeAction({
        marker: {
            title: 'Add import test1 from testLib',
            edits: [
                { range: resultRange, newText: 'from testLib import test1\n\n\n' },
                { range: markerRange, newText: 'test1' },
            ],
        },
    });
}
