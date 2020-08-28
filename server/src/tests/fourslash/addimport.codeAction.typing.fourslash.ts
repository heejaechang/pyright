/// <reference path="../../../pyright/server/src/tests/fourslash/fourslash.ts" />
// @indexerwithoutstdlib: true

// @filename: mspythonconfig.json
//// {
////   "stubPath  ": "typings"
//// }

// @filename: test1.py
//// c = [|/*marker*/TypingStubFileFunction|]()

// @filename: typings/stubFile.pyi
//// def TypingStubFileFunction():
////     pass

{
    const positionRange = helper.getPositionRange(`marker`);

    // @ts-ignore
    await helper.verifyCodeActions({
        marker: {
            codeActions: [
                {
                    title: `Add import TypingStubFileFunction from stubFile`,
                    kind: Consts.CodeActionKind.QuickFix,
                    command: {
                        title: 'Add import TypingStubFileFunction from stubFile',
                        command: 'python.addImport',
                        arguments: ['\\test1.py', JSON.stringify(positionRange), 'TypingStubFileFunction', 'stubFile'],
                    },
                },
            ],
        },
    });
}
