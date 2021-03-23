/// <reference path="fourslash.ts" />

// @filename: mspythonconfig.json
//// {
////   "useLibraryCodeForTypes": true
//// }

// @filename: package1-stubs/py.typed
// @library: true
//// partial
////

// @filename: package1-stubs/api.pyi
// @library: true
//// def func1() -> bool:
////     '''func1 docs'''
////     ...

// @filename: package1/__init__.py
// @library: true
//// from .api import func1

// @filename: package1/api.pyi
// @library: true
//// def func1() -> bool: ...

// @filename: test.py
//// import package1
////
//// print(package1.[|/*marker*/func1|]())

helper.verifyHover('markdown', {
    marker: '```python\n(function) func1: () -> bool\n```\n---\nfunc1 docs',
});
