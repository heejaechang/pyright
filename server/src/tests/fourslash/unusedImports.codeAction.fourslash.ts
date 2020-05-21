/// <reference path="../../../pyright/server/src/tests/fourslash/fourslash.ts" />

// @filename: mspythonconfig.json
//// {
////   "reportUnusedImport": true
//// }

// @filename: testLib/__init__.py
// @library: true
//// class Test:
////    pass

// @filename: test.py
//// import testLib as [|/*marker*/t|]l

{
    const positionRange = helper.getPositionRange(`marker`);

    // @ts-ignore
    await helper.verifyCodeActions({
        marker: {
            codeActions: [
                {
                    title: `Remove unused import`,
                    kind: Consts.CodeActionKind.QuickFix,
                    command: {
                        title: 'Remove unused import',
                        command: 'python.removeUnusedImport',
                        arguments: ['\\test.py', JSON.stringify(positionRange)],
                    },
                },
            ],
        },
    });
}
