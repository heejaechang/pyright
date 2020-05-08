/// <reference path="../../../pyright/server/src/tests/fourslash/fourslash.ts" />
// @asynctest: true

// @filename: mspythonconfig.json
//// {
////   "typeCheckingMode ": "basic"
//// }

// @filename: test1.py
//// from testLib import MyClass[|/*result*/|]
////
//// a = [|/*marker*/MyClass2|]()

// @filename: test2.py
//// import testLib

// @filename: testLib/__init__.pyi
// @library: true
//// class MyClass:
////     pass
//// class MyClass2:
////     pass

{
    const resultRange = helper.getPositionRange('result');
    const markerRange = helper.getPositionRange('marker');

    helper.verifyInvokeCodeAction({
        marker: {
            title: 'Add import MyClass2 from testLib',
            edits: [
                { range: resultRange, newText: ', MyClass2' },
                { range: markerRange, newText: 'MyClass2' },
            ],
        },
    });
}
