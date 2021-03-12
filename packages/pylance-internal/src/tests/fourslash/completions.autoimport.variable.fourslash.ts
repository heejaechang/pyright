/// <reference path="fourslash.ts" />

// @filename: test1.py
//// c = [|/*marker*/db|]

// @filename: test2.py
//// class DB:
////     pass
////
//// db = DB()
////
//// __all__ = [ "db" ]

{
    helper.openFiles([0, 1]);

    // @ts-ignore
    await helper.verifyCompletion('excluded', 'markdown', {
        marker: {
            completions: [
                {
                    label: 'db',
                    kind: Consts.CompletionItemKind.Class,
                },
            ],
        },
    });
}
