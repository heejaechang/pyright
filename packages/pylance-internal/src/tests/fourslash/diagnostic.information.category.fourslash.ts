/// <reference path="fourslash.ts" />

// @filename: test.py
//// # mspython: reportUndefinedVariable=information
//// d = [|/*marker*/UnknownType|]()

helper.verifyDiagnostics({
    marker: { category: 'information', message: `"UnknownType" is not defined` },
});
