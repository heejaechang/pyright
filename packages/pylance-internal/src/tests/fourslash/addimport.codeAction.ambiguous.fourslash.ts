/// <reference path="fourslash.ts" />
// @indexer: true

// @filename: test1.py
//// [|/*marker*/time|]

{
    const positionRange = helper.getPositionRange(`marker`);

    // @ts-ignore
    await helper.verifyCodeActions({
        marker: {
            codeActions: [
                {
                    title: `Add import time`,
                    kind: Consts.CodeActionKind.QuickFix,
                    command: {
                        title: 'Add import time',
                        command: 'python.addImport',
                        arguments: ['\\test1.py', JSON.stringify(positionRange), 'time', undefined],
                    },
                },
                {
                    title: `Add import time from time`,
                    kind: Consts.CodeActionKind.QuickFix,
                    command: {
                        title: 'Add import time from time',
                        command: 'python.addImport',
                        arguments: ['\\test1.py', JSON.stringify(positionRange), 'time', 'time'],
                    },
                },
            ],
        },
    });
}
