/// <reference path="fourslash.ts" />
// @indexerwithoutstdlib: true

// @filename: mspythonconfig.json
//// {
////   "stubPath  ": "typings"
//// }

// @filename: test1.py
//// [|/*result*/|]a = [|/*marker*/SubModType|]

// @filename: typings/typingLib/__init__.pyi
//// from testLib.subModules import SubModType as SubModType

// @filename: typings/typingLib/__init__.py
//// from testLib.subModules import SubModType

// @filename: testLib/__init__.pyi
// @library: true
//// from testLib.subModules import SubModType as SubModType

// @filename: testLib/__init__.py
// @library: true
//// from testLib.subModules import SubModType

// @filename: testLib/subModules.pyi
// @library: true
//// class SubModType: ...

// @filename: testLib/subModules.py
// @library: true
//// class SubModType:
////     pass

{
    const resultRange = helper.getPositionRange('result');
    const markerRange = helper.getPositionRange('marker');

    // @ts-ignore
    await helper.verifyInvokeCodeAction({
        marker: {
            title: 'Add import SubModType from typingLib',
            edits: [
                { range: resultRange, newText: 'from typingLib import SubModType\n\n\n' },
                { range: markerRange, newText: 'SubModType' },
            ],
        },
    });
}
