/// <reference path="fourslash.ts" />

// @filename: importresolved.py
//// # django will resolve, have bundled stubs and sources
////
//// import django
//// print(django.__version__)

// @filename: django/__init__.py
// @library: true
//// # django installed in site-packages

helper.verifyDiagnostics({});
