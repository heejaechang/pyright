/// <reference path="fourslash.ts" />
// @indexerwithoutstdlib: true

// @filename: test1.py
//// [|/*result*/|]a = [|/*marker*/TestType|]

// @filename: testLib/__init__.pyi
// @library: true
//// from testLib2 import TestType

// @filename: testLib/__init__.py
// @library: true
//// from testLib2 import TestType

// @filename: testLib2/__init__.pyi
// @library: true
//// class TestType: ...

// @filename: testLib2/__init__.py
// @library: true
//// class TestType:
////     pass

{
    const resultRange = helper.getPositionRange('result');
    const markerRange = helper.getPositionRange('marker');

    // @ts-ignore
    await helper.verifyInvokeCodeAction(
        {
            marker: {
                title: 'Add import TestType from testLib2',
                edits: [
                    { range: resultRange, newText: 'from testLib2 import TestType\n\n\n' },
                    { range: markerRange, newText: 'TestType' },
                ],
            },
        },
        true
    );
}
