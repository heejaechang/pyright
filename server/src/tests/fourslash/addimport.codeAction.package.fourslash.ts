/// <reference path="../../../pyright/server/src/tests/fourslash/fourslash.ts" />

// @filename: mspythonconfig.json
//// {
////   "stubPath  ": "typings"
//// }

// @filename: test1.py
//// c = [|/*marker1*/stubFile|]()
//// c = [|/*marker2*/testLib|]()
//// c = [|/*marker3*/nested|]()
//// c = [|/*marker4*/regularFile|]()
//// c = [|/*marker5*/topLevelStubFile|]()

// @filename: typings/stubFile.pyi
//// class MyType:
////     pass

// @filename: testLib/__init__.pyi
// @library: true
//// class MyType:
////     pass

// @filename: testLib/stubFile.pyi
// @library: true
//// class MyType:
////     pass

// @filename: testLib/nested/__init__.py
// @library: true
//// class MyType:
////     pass

// @filename: testLib/nested/regularFile.py
// @library: true
//// class MyType:
////     pass

// @filename: testLib/noInit/stubFile.pyi
// @library: true
//// class MyType:
////     pass

// @filename: topLevelStubFile.pyi
// @library: true
//// class MyType:
////     pass

{
    const positionRange1 = helper.getPositionRange(`marker1`);
    const positionRange2 = helper.getPositionRange(`marker2`);
    const positionRange3 = helper.getPositionRange(`marker3`);
    const positionRange4 = helper.getPositionRange(`marker4`);
    const positionRange5 = helper.getPositionRange(`marker5`);

    // @ts-ignore
    await helper.verifyCodeActions({
        marker1: {
            codeActions: [
                {
                    title: `Add import stubFile`,
                    kind: Consts.CodeActionKind.QuickFix,
                    command: {
                        title: 'Add import stubFile',
                        command: 'python.addImport',
                        arguments: ['\\test1.py', JSON.stringify(positionRange1), 'stubFile', 'stubFile'],
                    },
                },
                {
                    title: `Add import stubFile from testLib`,
                    kind: Consts.CodeActionKind.QuickFix,
                    command: {
                        title: 'Add import stubFile from testLib',
                        command: 'python.addImport',
                        arguments: ['\\test1.py', JSON.stringify(positionRange1), 'stubFile', 'testLib'],
                    },
                },
                {
                    title: `Add import stubFile from testLib.noInit`,
                    kind: Consts.CodeActionKind.QuickFix,
                    command: {
                        title: 'Add import stubFile from testLib.noInit',
                        command: 'python.addImport',
                        arguments: ['\\test1.py', JSON.stringify(positionRange1), 'stubFile', 'testLib.noInit'],
                    },
                },
            ],
        },
        marker2: {
            codeActions: [
                {
                    title: `Add import testLib`,
                    kind: Consts.CodeActionKind.QuickFix,
                    command: {
                        title: 'Add import testLib',
                        command: 'python.addImport',
                        arguments: ['\\test1.py', JSON.stringify(positionRange2), 'testLib', 'testLib'],
                    },
                },
            ],
        },
        marker3: {
            codeActions: [
                {
                    title: `Add import nested from testLib`,
                    kind: Consts.CodeActionKind.QuickFix,
                    command: {
                        title: 'Add import nested from testLib',
                        command: 'python.addImport',
                        arguments: ['\\test1.py', JSON.stringify(positionRange3), 'nested', 'testLib'],
                    },
                },
            ],
        },
        marker4: {
            codeActions: [
                {
                    title: `Add import regularFile from testLib.nested`,
                    kind: Consts.CodeActionKind.QuickFix,
                    command: {
                        title: 'Add import regularFile from testLib.nested',
                        command: 'python.addImport',
                        arguments: ['\\test1.py', JSON.stringify(positionRange4), 'regularFile', 'testLib.nested'],
                    },
                },
            ],
        },
        marker5: {
            codeActions: [
                {
                    title: `Add import topLevelStubFile`,
                    kind: Consts.CodeActionKind.QuickFix,
                    command: {
                        title: 'Add import topLevelStubFile',
                        command: 'python.addImport',
                        arguments: [
                            '\\test1.py',
                            JSON.stringify(positionRange5),
                            'topLevelStubFile',
                            'topLevelStubFile',
                        ],
                    },
                },
            ],
        },
    });
}
