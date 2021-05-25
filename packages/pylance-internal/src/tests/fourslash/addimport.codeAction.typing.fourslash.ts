/// <reference path="fourslash.ts" />
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
                    title: `Add "from stubFile import TypingStubFileFunction"`,
                    kind: Consts.CodeActionKind.QuickFix,
                    command: {
                        title: 'Add "from stubFile import TypingStubFileFunction"',
                        command: 'python.addImport',
                        arguments: ['\\test1.py', JSON.stringify(positionRange), 'TypingStubFileFunction', 'stubFile'],
                    },
                },
            ],
        },
    });
}
