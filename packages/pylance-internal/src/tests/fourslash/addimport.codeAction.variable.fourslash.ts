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
                        title: `Add "from test2 import db"`,
                        kind: Consts.CodeActionKind.QuickFix,
                        command: {
                            title: 'Add "from test2 import db"',
                            command: 'python.addImport',
                            arguments: ['\\test1.py', JSON.stringify(positionRange), 'db', 'test2'],
                        },
                    },
                    {
                        title: `Add "from test2 import DB"`,
                        kind: Consts.CodeActionKind.QuickFix,
                        command: {
                            title: 'Add "from test2 import DB"',
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
