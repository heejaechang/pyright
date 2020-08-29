/// <reference path="../../../pyright/server/src/tests/fourslash/fourslash.ts" />

// @filename: mspythonconfig.json
//// {
////   "typeCheckingMode ": "basic"
//// }

// @filename: test1.py
//// c = [|/*marker1*/os|]
//// d = [|/*marker2*/sys|]

// @filename: test2.py
//// import os
//// import sys
//// a = os.path
//// b = sys.path

{
    const positionRange1 = helper.getPositionRange(`marker1`);
    const positionRange2 = helper.getPositionRange(`marker2`);

    // @ts-ignore
    await helper.verifyCodeActions({
        marker1: {
            codeActions: [
                {
                    title: `Add import os`,
                    kind: Consts.CodeActionKind.QuickFix,
                    command: {
                        title: 'Add import os',
                        command: 'python.addImport',
                        arguments: ['\\test1.py', JSON.stringify(positionRange1), 'os', 'os'],
                    },
                },
            ],
        },
        marker2: {
            codeActions: [
                {
                    title: `Add import sys`,
                    kind: Consts.CodeActionKind.QuickFix,
                    command: {
                        title: 'Add import sys',
                        command: 'python.addImport',
                        arguments: ['\\test1.py', JSON.stringify(positionRange2), 'sys', 'sys'],
                    },
                },
            ],
        },
    });
}
