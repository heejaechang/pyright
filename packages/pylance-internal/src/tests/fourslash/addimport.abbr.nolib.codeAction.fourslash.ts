/// <reference path="fourslash.ts" />

// @filename: mspythonconfig.json
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
