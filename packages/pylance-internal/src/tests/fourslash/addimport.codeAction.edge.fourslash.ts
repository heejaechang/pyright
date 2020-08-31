/// <reference path="fourslash.ts" />

// @filename: mspythonconfig.json
//// {
////   "typeCheckingMode ": "basic"
//// }

// @filename: test1.py
//// c1 = [|/*result1*/[|/*marker1*/|]T|]()
//// c2 = [|/*result2*/S[|/*marker2*/|]|]()

// @filename: test2.py
//// class T:
////     pass
//// class S:
////     pass

{
    const positionRange1 = helper.getPositionRange(`result1`);
    const positionRange2 = helper.getPositionRange(`result2`);

    // @ts-ignore
    await helper.verifyCodeActions({
        marker1: {
            codeActions: [
                {
                    title: `Add import T from test2`,
                    kind: Consts.CodeActionKind.QuickFix,
                    command: {
                        title: 'Add import T from test2',
                        command: 'python.addImport',
                        arguments: ['\\test1.py', JSON.stringify(positionRange1), 'T', 'test2'],
                    },
                },
            ],
        },
        marker2: {
            codeActions: [
                {
                    title: `Add import S from test2`,
                    kind: Consts.CodeActionKind.QuickFix,
                    command: {
                        title: 'Add import S from test2',
                        command: 'python.addImport',
                        arguments: ['\\test1.py', JSON.stringify(positionRange2), 'S', 'test2'],
                    },
                },
            ],
        },
    });
}
