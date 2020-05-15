/// <reference path="../../../pyright/server/src/tests/fourslash/fourslash.ts" />
// @asynctest: true

// @filename: mspythonconfig.json
//// {
////   "reportUnusedImport": true
//// }

// @filename: test.py
//// def Test():
////     [|/*marker*/c1|] = 1

{
    helper.verifyCodeActions(
        {
            marker: {
                codeActions: [],
            },
        },
        true
    );
}
