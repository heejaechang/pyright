/// <reference path="fourslash.ts" />

// @filename: renamedFolder/__init__.py
//// [|/*marker1*/|]
//// from . import module as module

// @filename: renamedFolder/module.py
//// def foo(): pass

// @filename: renamedFolder/nested/__init__.py
//// [|/*marker2*/|]
//// from ...[|originalFolder|] import nested

// @filename: renamedFolder/nested/module.py
//// [|/*marker3*/|]
//// from ... import [|originalFolder|]

{
    const title = 'Rename File';
    const command = 'pylance.renameFile';

    const fileName1 = helper.getMarkerByName('marker1').fileName;
    const fileName2 = helper.getMarkerByName('marker2').fileName;
    const fileName3 = helper.getMarkerByName('marker3').fileName;

    // @ts-ignore
    await helper.verifyPylanceCommand(
        {
            title,
            command,
            arguments: [
                [
                    {
                        oldUri: helper.getDirectoryPath(fileName1.replace('renamedFolder', 'originalFolder')),
                        newUri: helper.getDirectoryPath(fileName1),
                    },
                ],
                true,
            ],
        },
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
                    needsConfirmation: true,
                },
            },
        }
    );
}
