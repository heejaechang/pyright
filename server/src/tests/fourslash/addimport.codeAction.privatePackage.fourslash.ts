/// <reference path="../../../pyright/server/src/tests/fourslash/fourslash.ts" />

// @filename: test1.py
//// c = [|/*marker*/privateFile|]()

// @filename: testLib/__private/privateFile.pyi
// @library: true
//// class MyType:
////     pass

{
    // @ts-ignore
    await helper.verifyCodeActions(
        {
            marker: {
                codeActions: [],
            },
        },
        true
    );
}
