/// <reference path="../../../pyright/server/src/tests/fourslash/fourslash.ts" />

// @filename: test.py
//// # mspython: reportUndefinedVariable=information
//// d = [|/*marker*/UnknownType|]()

helper.verifyDiagnostics({
    marker: { category: 'information', message: `"UnknownType" is not defined` },
});
