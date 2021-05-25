/// <reference path="fourslash.ts" />
// @indexerwithoutstdlib: true

// @filename: test1.py
//// c = [|/*marker1*/ClosedFileType|]()
//// c = [|/*marker3*/TestLibVariable|]()
//// c = [|/*marker4*/TestLibSubModuleFunction|]()
//// c = [|/*marker5*/TestLibNestedType|]()
//// c = [|/*marker6*/TestLibNestedSubModuleType|]()
//// c = [|/*marker7*/TestLibStubFileType|]()
//// c = [|/*marker8*/StubFileType|]()

// @filename: test2.py
//// class ClosedFileType:
////     pass

// @filename: testLib/__init__.pyi
// @library: true
//// TestLibVariable = ...

// @filename: testLib/__init__.py
// @library: true
//// TestLibVariable = 1

// @filename: testLib/stubFile.pyi
// @library: true
//// def TestLibSubModuleFunction(): ...

// @filename: testLib/stubFile.py
// @library: true
//// def TestLibSubModuleFunction():
////     pass

// @filename: testLib/nested/__init__.pyi
// @library: true
//// class TestLibNestedType: ...

// @filename: testLib/nested/__init__.py
// @library: true
//// class TestLibNestedType:
////     pass

// @filename: testLib/nested/regularFile.pyi
// @library: true
//// class TestLibNestedSubModuleType: ...

// @filename: testLib/nested/regularFile.py
// @library: true
//// class TestLibNestedSubModuleType:
////     pass

// @filename: testLib/noInit/stubFile.pyi
// @library: true
//// class TestLibStubFileType: ...

// @filename: testLib/noInit/__init__.py
// @library: true
//// from . import TestLibStubFileType

// @filename: testLib/noInit/stubFile.py
// @library: true
//// class TestLibStubFileType:
////     pass

// @filename: topLevelStubFile.pyi
// @library: true
//// class StubFileType: ...

// @filename: topLevelStubFile/__init__.py
// @library: true
//// class StubFileType:
////     pass

{
    const positionRange1 = helper.getPositionRange(`marker1`);
    const positionRange3 = helper.getPositionRange(`marker3`);
    const positionRange4 = helper.getPositionRange(`marker4`);
    const positionRange5 = helper.getPositionRange(`marker5`);
    const positionRange6 = helper.getPositionRange(`marker6`);
    const positionRange7 = helper.getPositionRange(`marker7`);
    const positionRange8 = helper.getPositionRange(`marker8`);

    // @ts-ignore
    await helper.verifyCodeActions({
        marker1: {
            codeActions: [
                {
                    title: `Add "from test2 import ClosedFileType"`,
                    kind: Consts.CodeActionKind.QuickFix,
                    command: {
                        title: 'Add "from test2 import ClosedFileType"',
                        command: 'python.addImport',
                        arguments: ['\\test1.py', JSON.stringify(positionRange1), 'ClosedFileType', 'test2'],
                    },
                },
            ],
        },
        marker3: {
            codeActions: [
                {
                    title: `Add "from testLib import TestLibVariable"`,
                    kind: Consts.CodeActionKind.QuickFix,
                    command: {
                        title: 'Add "from testLib import TestLibVariable"',
                        command: 'python.addImport',
                        arguments: ['\\test1.py', JSON.stringify(positionRange3), 'TestLibVariable', 'testLib'],
                    },
                },
            ],
        },
        marker4: {
            codeActions: [],
        },
        marker5: {
            codeActions: [],
        },
        marker6: {
            codeActions: [],
        },
        marker7: {
            codeActions: [],
        },
        marker8: {
            codeActions: [
                {
                    title: `Add "from topLevelStubFile import StubFileType"`,
                    kind: Consts.CodeActionKind.QuickFix,
                    command: {
                        title: 'Add "from topLevelStubFile import StubFileType"',
                        command: 'python.addImport',
                        arguments: ['\\test1.py', JSON.stringify(positionRange8), 'StubFileType', 'topLevelStubFile'],
                    },
                },
            ],
        },
    });
}
