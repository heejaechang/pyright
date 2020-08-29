/// <reference path="../../../pyright/server/src/tests/fourslash/fourslash.ts" />
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
                    title: `Add import ClosedFileType from test2`,
                    kind: Consts.CodeActionKind.QuickFix,
                    command: {
                        title: 'Add import ClosedFileType from test2',
                        command: 'python.addImport',
                        arguments: ['\\test1.py', JSON.stringify(positionRange1), 'ClosedFileType', 'test2'],
                    },
                },
            ],
        },
        marker3: {
            codeActions: [
                {
                    title: `Add import TestLibVariable from testLib`,
                    kind: Consts.CodeActionKind.QuickFix,
                    command: {
                        title: 'Add import TestLibVariable from testLib',
                        command: 'python.addImport',
                        arguments: ['\\test1.py', JSON.stringify(positionRange3), 'TestLibVariable', 'testLib'],
                    },
                },
            ],
        },
        marker4: {
            codeActions: [
                {
                    title: `Add import TestLibSubModuleFunction from testLib.stubFile`,
                    kind: Consts.CodeActionKind.QuickFix,
                    command: {
                        title: 'Add import TestLibSubModuleFunction from testLib.stubFile',
                        command: 'python.addImport',
                        arguments: [
                            '\\test1.py',
                            JSON.stringify(positionRange4),
                            'TestLibSubModuleFunction',
                            'testLib.stubFile',
                        ],
                    },
                },
            ],
        },
        marker5: {
            codeActions: [
                {
                    title: `Add import TestLibNestedType from testLib.nested`,
                    kind: Consts.CodeActionKind.QuickFix,
                    command: {
                        title: 'Add import TestLibNestedType from testLib.nested',
                        command: 'python.addImport',
                        arguments: [
                            '\\test1.py',
                            JSON.stringify(positionRange5),
                            'TestLibNestedType',
                            'testLib.nested',
                        ],
                    },
                },
            ],
        },
        marker6: {
            codeActions: [
                {
                    title: `Add import TestLibNestedSubModuleType from testLib.nested.regularFile`,
                    kind: Consts.CodeActionKind.QuickFix,
                    command: {
                        title: 'Add import TestLibNestedSubModuleType from testLib.nested.regularFile',
                        command: 'python.addImport',
                        arguments: [
                            '\\test1.py',
                            JSON.stringify(positionRange6),
                            'TestLibNestedSubModuleType',
                            'testLib.nested.regularFile',
                        ],
                    },
                },
            ],
        },
        marker7: {
            codeActions: [
                {
                    title: `Add import TestLibStubFileType from testLib.noInit.stubFile`,
                    kind: Consts.CodeActionKind.QuickFix,
                    command: {
                        title: 'Add import TestLibStubFileType from testLib.noInit.stubFile',
                        command: 'python.addImport',
                        arguments: [
                            '\\test1.py',
                            JSON.stringify(positionRange7),
                            'TestLibStubFileType',
                            'testLib.noInit.stubFile',
                        ],
                    },
                },
            ],
        },
        marker8: {
            codeActions: [
                {
                    title: `Add import StubFileType from topLevelStubFile`,
                    kind: Consts.CodeActionKind.QuickFix,
                    command: {
                        title: 'Add import StubFileType from topLevelStubFile',
                        command: 'python.addImport',
                        arguments: ['\\test1.py', JSON.stringify(positionRange8), 'StubFileType', 'topLevelStubFile'],
                    },
                },
            ],
        },
    });
}
