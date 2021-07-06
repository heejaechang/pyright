/// <reference path="fourslash.ts" />

// @filename: pyrightconfig.json
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
