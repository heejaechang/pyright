/// <reference path="../../../pyright/server/src/tests/fourslash/fourslash.ts" />

// @filename: importresolved.py
//// # notexistant will not resolve, no stubs, no sources (error)
//// # matplotlib will not resolve, bundled stubs but no sources (warning)
//// # django will resolve, bundled stubs and sources
////
//// import [|/*marker1*/notexistant|]
//// import [|/*marker2*/matplotlib|]
//// import django

// @filename: django/__init__.py
// @library: true
//// # django installed in site-packages

helper.verifyDiagnostics({
    marker1: { category: 'error', message: 'Import "notexistant" could not be resolved' },
    marker2: { category: 'warning', message: 'Import "matplotlib" could not be resolved from source' },
});
