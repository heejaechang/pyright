/// <reference path="../../../pyright/server/src/tests/fourslash/fourslash.ts" />
// @asynctest: true

// @filename: mspythonconfig.json
//// {
////   "typeCheckingMode ": "basic"
//// }

// @filename: test1.py
//// [|/*result*/|]a = [|/*marker*/Pesp|]

// @filename: test2.py
//// import testLib

// @filename: testLib/__init__.pyi
// @library: true
//// class Test:
////     pass

{
    const resultRange = helper.getPositionRange('result');
    const markerRange = helper.getPositionRange('marker');

    helper.verifyInvokeCodeAction({
        marker: {
            title: 'Add import Test from testLib',
            edits: [
                { range: resultRange, newText: 'from testLib import Test\n\n\n' },
                { range: markerRange, newText: 'Test' },
            ],
        },
    });
}
