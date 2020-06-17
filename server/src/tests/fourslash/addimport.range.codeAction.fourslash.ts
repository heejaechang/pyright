/// <reference path="../../../pyright/server/src/tests/fourslash/fourslash.ts" />

// @filename: test1.py
//// [|/*marker*/testLib|].Test

// @filename: testLib/__init__.pyi
// @library: true
//// class Test:
////     pass

{
    const positionRange = helper.getPositionRange(`marker`);

    // @ts-ignore
    await helper.verifyCodeActions({
        marker: {
            codeActions: [
                {
                    title: `Add import testLib`,
                    kind: Consts.CodeActionKind.QuickFix,
                    command: {
                        title: 'Add import testLib',
                        command: 'python.addImport',
                        arguments: ['\\test1.py', JSON.stringify(positionRange), 'testLib', 'testLib'],
                    },
                },
            ],
        },
    });
}
