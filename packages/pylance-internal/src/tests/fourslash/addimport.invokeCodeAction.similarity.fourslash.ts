/// <reference path="fourslash.ts" />

// @filename: pyrightconfig.json
//// {
////   "typeCheckingMode ": "basic"
//// }

// @filename: test1.py
//// [|/*result*/|]a = [|/*marker*/MyDlass|]

// @filename: test2.py
//// import testLib

// @filename: testLib/__init__.pyi
// @library: true
//// class MyClass:
////     pass

{
    const resultRange = helper.getPositionRange('result');
    const markerRange = helper.getPositionRange('marker');

    // @ts-ignore
    await helper.verifyInvokeCodeAction({
        marker: {
            title: 'Add "from testLib import MyClass"',
            edits: [
                { range: resultRange, newText: 'from testLib import MyClass\n\n\n' },
                { range: markerRange, newText: 'MyClass' },
            ],
        },
    });
}
