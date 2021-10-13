/// <reference path="fourslash.ts" />

// @filename: module.py
//// [|/*pythonFile*/|]

// @filename: module.pyi
//// [|/*stubFile*/|]

{
    const stubFile = helper.getMarkerByName('stubFile').fileName;
    const pythonFile = helper.getMarkerByName('pythonFile').fileName;

    // @ts-ignore
    await helper.verifyRenameFiles(stubFile, stubFile.replace('module', 'module1'), {
        documentChanges: [
            {
                kind: 'rename',
                oldUri: helper.convertPathToUri(pythonFile),
                newUri: helper.convertPathToUri(pythonFile.replace('module', 'module1')),
                options: { ignoreIfExists: true },
                annotationId: 'fileRename',
            },
        ],
        changeAnnotations: {
            textEdit: {
                label: 'Update all import references for "module.pyi" to "module1.pyi"?',
                description: 'Update all import references for "module.pyi" to "module1.pyi"?',
                needsConfirmation: false,
            },
            fileRename: {
                label: 'Update all import references for "module.pyi" to "module1.pyi"?',
                description: 'Update all import references for "module.pyi" to "module1.pyi"?',
                needsConfirmation: false,
            },
        },
    });
}
