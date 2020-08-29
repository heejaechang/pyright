/// <reference path="fourslash.ts" />

// @filename: importnotresolved.py
//// # django will resolve using bundled stubs, but source not found
////
//// import [|/*marker1*/django|]
//// print(django.__version__)

helper.verifyDiagnostics({
    marker1: { category: 'warning', message: 'Import "django" could not be resolved from source' },
});
