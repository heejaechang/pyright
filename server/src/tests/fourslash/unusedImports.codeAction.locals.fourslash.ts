/// <reference path="../../../pyright/server/src/tests/fourslash/fourslash.ts" />

// @filename: mspythonconfig.json
//// {
////   "reportUnusedImport": true
//// }

// @filename: test.py
//// def Test():
////     [|/*marker*/c1|] = 1

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
