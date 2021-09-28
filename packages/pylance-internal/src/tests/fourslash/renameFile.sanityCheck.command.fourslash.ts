/// <reference path="fourslash.ts" />

// @filename: test1.py
//// [|/*newFile*/|]

// @filename: test.pyi
//// # stub

// @filename: MyLib/__init__.py
// @library: true
//// [|/*libFile*/|]

{
    const title = 'Rename File';
    const command = 'pylance.renameFile';

    const newFile = helper.getMarkerByName('newFile').fileName;
    const libFile = helper.getMarkerByName('libFile').fileName;

    // @ts-ignore
    await helper.verifyPylanceCommand(
        {
            title,
            command,
            arguments: [],
        },
        []
    );

    // @ts-ignore
    await helper.verifyPylanceCommand(
        {
            title,
            command,
            arguments: [[{}]],
        },
        []
    );

    // @ts-ignore
    await helper.verifyPylanceCommand(
        {
            title,
            command,
            arguments: [[{ oldUri: 'test1.pyi', newUri: newFile }], true],
        },
        []
    );

    // @ts-ignore
    await helper.verifyPylanceCommand(
        {
            title,
            command,
            arguments: [[{ oldUri: 'test.ts', newUri: 'test1.ts' }], true],
        },
        []
    );

    // @ts-ignore
    await helper.verifyPylanceCommand(
        {
            title,
            command,
            arguments: [[{ oldUri: 'test.py', newUri: libFile }], true],
        },
        []
    );

    // @ts-ignore
    await helper.verifyPylanceCommand(
        {
            title,
            command,
            arguments: [[{ oldUri: newFile.replace('test1', 'test'), newUri: newFile }], true],
        },
        []
    );

    // @ts-ignore
    await helper.verifyPylanceCommand(
        {
            title,
            command,
            arguments: [[{ oldUri: newFile, newUri: newFile.replace('test1', 'test') }], true],
        },
        []
    );

    // @ts-ignore
    await helper.verifyPylanceCommand(
        {
            title,
            command,
            arguments: [[{ oldUri: newFile, newUri: libFile }], true],
        },
        []
    );
}
