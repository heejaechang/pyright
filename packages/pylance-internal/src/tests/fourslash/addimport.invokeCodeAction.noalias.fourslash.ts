/// <reference path="../../../pyright/server/src/tests/fourslash/fourslash.ts" />
// @indexerwithoutstdlib: true

// @filename: test1.py
//// [|/*result*/|]a = [|/*marker*/SubModType|]

// @filename: testLib/__init__.py
// @library: true
//// from testLib.subModules import SubModType
//// __all__ = ['SubModeType']

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
    await helper.verifyInvokeCodeAction(
        {
            marker: {
                title: 'Add import SubModType from testLib.subModules',
                edits: [
                    { range: resultRange, newText: 'from testLib.subModules import SubModType\n\n\n' },
                    { range: markerRange, newText: 'SubModType' },
                ],
            },
        },
        true
    );
}
