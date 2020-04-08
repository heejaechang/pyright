/// <reference path="../../../pyright/server/src/tests/fourslash/fourslash.ts" />

// @filename: importresolved.py
//// # django will resolve, found in bundled stubs
//// # notexistant will not resolve, it is there to get at least one diagnostic result
////
//// import [|/*marker1*/notexistant|]
//// import django
////

helper.verifyDiagnostics({
    marker1: { category: 'error', message: 'Import "notexistant" could not be resolved' },
});
