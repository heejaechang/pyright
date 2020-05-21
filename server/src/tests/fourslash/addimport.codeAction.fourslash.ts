/// <reference path="../../../pyright/server/src/tests/fourslash/fourslash.ts" />

// @filename: mspythonconfig.json
//// {
////   "typeCheckingMode ": "basic"
//// }

// @filename: test1.py
//// c = [|/*marker*/Test|]()

// @filename: test2.py
//// class Test:
////     pass

{
    const positionRange = helper.getPositionRange(`marker`);

    // @ts-ignore
    await helper.verifyCodeActions({
        marker: {
            codeActions: [
                {
                    title: `Add import Test from test2`,
                    kind: Consts.CodeActionKind.QuickFix,
                    command: {
                        title: 'Add import Test from test2',
                        command: 'python.addImport',
                        arguments: ['\\test1.py', JSON.stringify(positionRange), 'Test', 'test2'],
                    },
                },
            ],
        },
    });
}
