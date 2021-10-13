/// <reference path="fourslash.ts" />

// @filename: originalFolder/__init__.py
//// [|/*marker1*/|]
//// from . import module as module

// @filename: originalFolder/module.py
//// def foo(): pass

// @filename: originalFolder/nested/__init__.py
//// [|/*marker2*/|]
//// from ...[|originalFolder|] import nested

// @filename: originalFolder/nested/module.py
//// [|/*marker3*/|]
//// from ... import [|originalFolder|]

{
    const fileName1 = helper.getMarkerByName('marker1').fileName;
    const fileName2 = helper.getMarkerByName('marker2').fileName;
    const fileName3 = helper.getMarkerByName('marker3').fileName;

    // @ts-ignore
    await helper.verifyRenameFiles(
        helper.getDirectoryPath(fileName1),
        helper.getDirectoryPath(fileName1.replace('originalFolder', 'renamedFolder')),
        {
            documentChanges: [
                {
                    textDocument: {
                        uri: helper.convertPathToUri(fileName2),
                        version: null,
                    },
                    edits: helper
                        .getRangesByText()
                        .get('originalFolder')!
                        .filter((r) => r.fileName === fileName2)
                        .map((r) => ({
                            annotationId: 'textEdit',
                            newText: 'renamedFolder',
                            range: helper.convertPositionRange(r),
                        })),
                },
                {
                    textDocument: {
                        uri: helper.convertPathToUri(fileName3),
                        version: null,
                    },
                    edits: helper
                        .getRangesByText()
                        .get('originalFolder')!
                        .filter((r) => r.fileName === fileName3)
                        .map((r) => ({
                            annotationId: 'textEdit',
                            newText: 'renamedFolder',
                            range: helper.convertPositionRange(r),
                        })),
                },
            ],
            changeAnnotations: {
                textEdit: {
                    label: 'Update all import references for "originalFolder" to "renamedFolder"?',
                    description: 'Update all import references for "originalFolder" to "renamedFolder"?',
                    needsConfirmation: false,
                },
            },
        }
    );
}
