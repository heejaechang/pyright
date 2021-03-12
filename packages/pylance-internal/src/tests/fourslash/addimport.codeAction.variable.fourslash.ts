/// <reference path="fourslash.ts" />

// @filename: test1.py
//// c = [|/*marker*/db|]

// @filename: test2.py
//// class DB:
////     pass
////
//// db = DB()
//// db1 = DB() # No Code Action
////
//// __all__ = [ "db" ]

{
    helper.openFiles([0, 1]);

    const positionRange = helper.getPositionRange(`marker`);

    // @ts-ignore
    await helper.verifyCodeActions(
        {
            marker: {
                codeActions: [
                    {
                        title: `Add import db from test2`,
                        kind: Consts.CodeActionKind.QuickFix,
                        command: {
                            title: 'Add import db from test2',
                            command: 'python.addImport',
                            arguments: ['\\test1.py', JSON.stringify(positionRange), 'db', 'test2'],
                        },
                    },
                    {
                        title: `Add import DB from test2`,
                        kind: Consts.CodeActionKind.QuickFix,
                        command: {
                            title: 'Add import DB from test2',
                            command: 'python.addImport',
                            arguments: ['\\test1.py', JSON.stringify(positionRange), 'DB', 'test2'],
                        },
                    },
                ],
            },
        },
        /* verifyCodeActionCount */ true
    );
}
