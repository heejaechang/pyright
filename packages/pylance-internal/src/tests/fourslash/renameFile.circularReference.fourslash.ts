/// <reference path="fourslash.ts" />

// @filename: module1.py
//// [|/*marker1*/|]
//// from . import [|mySelf|] as [|mySelf|]

// @filename: mySelf.py
//// [|/*marker2*/|]
//// from module1 import *
//// [|mySelf|].foo()
////
//// def foo():
////     pass

{
    const fileName1 = helper.getMarkerByName('marker1').fileName;
    const fileName2 = helper.getMarkerByName('marker2').fileName;

    // @ts-ignore
    await helper.verifyRenameFiles(fileName2, fileName2.replace('mySelf', 'renamedModule'), {
        documentChanges: [
            {
                textDocument: {
                    uri: helper.convertPathToUri(fileName1),
                    version: null,
                },
                edits: helper
                    .getRangesByText()
                    .get('mySelf')!
                    .filter((r) => r.fileName === fileName1)
                    .map((r) => ({
                        annotationId: 'textEdit',
                        newText: 'renamedModule',
                        range: helper.convertPositionRange(r),
                    })),
            },
            {
                textDocument: {
                    uri: helper.convertPathToUri(fileName2),
                    version: null,
                },
                edits: helper
                    .getRangesByText()
                    .get('mySelf')!
                    .filter((r) => r.fileName === fileName2)
                    .map((r) => ({
                        annotationId: 'textEdit',
                        newText: 'renamedModule',
                        range: helper.convertPositionRange(r),
                    })),
            },
        ],
        changeAnnotations: {
            textEdit: {
                label: 'Update all import references for "mySelf.py" to "renamedModule.py"?',
                description: 'Update all import references for "mySelf.py" to "renamedModule.py"?',
                needsConfirmation: false,
            },
        },
    });
}
