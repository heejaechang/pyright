/// <reference path="fourslash.ts" />

// @filename: test.py
//// [|/*oldFile*/|]

// @filename: test.pyi
//// [|/*stubFile*/|]
//// # stub

// @filename: MyLib/__init__.py
// @library: true
//// [|/*libFile*/|]

// @filename: test.ts
//// [|/*tsFile*/|]
//// # random file

// @filename: noRef.py
//// [|/*noRefFile*/|]

{
    const oldFile = helper.getMarkerByName('oldFile').fileName;
    const stubFile = helper.getMarkerByName('stubFile').fileName;
    const tsFile = helper.getMarkerByName('tsFile').fileName;
    const libFile = helper.getMarkerByName('libFile').fileName;
    const noRefFile = helper.getMarkerByName('noRefFile').fileName;

    // @ts-ignore
    await helper.verifyRenameFiles('notExist.pyi', oldFile.replace('test', 'test1'), null);

    // @ts-ignore
    await helper.verifyRenameFiles(tsFile, tsFile.replace('test', 'test1'), null);

    // @ts-ignore
    await helper.verifyRenameFiles(oldFile, stubFile, null);

    // @ts-ignore
    await helper.verifyRenameFiles(oldFile, libFile, null);

    // @ts-ignore
    await helper.verifyRenameFiles(oldFile, oldFile.replace('test', 'test1'), null);

    // @ts-ignore
    await helper.verifyRenameFiles(noRefFile, noRefFile.replace('noRef', 'noRef1'), null);
}
