/// <reference path="fourslash.ts" />

// @filename: module.py
//// [|/*pythonFile*/|]

// @filename: module1.pyi
//// [|/*stubFile*/|]

{
    const title = 'Rename File';
    const command = 'pylance.renameFile';

    const stubFile = helper.getMarkerByName('stubFile').fileName;
    const pythonFile = helper.getMarkerByName('pythonFile').fileName;

    // @ts-ignore
    await helper.verifyPylanceCommand(
        {
            title,
            command,
            arguments: [[{ oldUri: stubFile.replace('module1', 'module'), newUri: stubFile }], true],
        },
        {
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
                    needsConfirmation: true,
                },
                fileRename: {
                    label: 'Update all import references for "module.pyi" to "module1.pyi"?',
                    description: 'Update all import references for "module.pyi" to "module1.pyi"?',
                    needsConfirmation: false,
                },
            },
        }
    );
}
