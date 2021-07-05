/// <reference path="fourslash.ts" />

// @filename: pyrightconfig.json
//// {
////   "typeCheckingMode ": "basic"
//// }

// @filename: test1.py
//// a = [|/*marker*/np|].array

{
    // @ts-ignore
    await helper.verifyCodeActions({
        marker: {
            codeActions: [],
        },
    });
}
