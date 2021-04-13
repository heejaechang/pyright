/// <reference path="fourslash.ts" />

// @filename: bundled/native-stubs/lib1/definition.pyi
//// def func():
////     '''func docs'''
////     ...
////
//// class MyType:
////     '''MyType docs'''
////     ...
////
//// class MyType2:
////     def func2():
////         '''func2 docs'''
////         pass
////
//// def func4():
////     '''func4 docs'''
////     ...

// @filename: lib1/definition.cp36-win_amd64.dylib
// @library: true
//// x = 1

// @filename: lib1/redirect.py
// @library: true
//// from .definition import *
////
//// __all__ = ['MyType']

// @filename: lib1/wildcard.py
// @library: true
//// from .redirect import *

// @filename: lib1/__init__.py
// @library: true
//// from .wildcard import *

// @filename: lib1/__init__.pyi
// @library: true
//// from typing import Any
//// func: Any
//// MyType: Any
//// class MyType2:
////     def func2() -> None : ...
//// def func4() -> None : ...

// @filename: test.py
//// import lib1
//// lib1.[|/*marker1*/func|]()
//// c = lib1.[|/*marker2*/MyType|]()
//// lib1.MyType2().[|/*marker3*/func2|]()
//// lib1.[|/*marker4*/func4|]()

helper.verifyHover('markdown', {
    marker1: '```python\n(variable) func: Any\n```\n---\nfunc docs',
    marker2: '```python\n(variable) MyType: Any\n```\n---\nMyType docs',
    marker3: '```python\n(method) func2: () -> None\n```\n---\nfunc2 docs',
    marker4: '```python\n(function) func4: () -> None\n```\n---\nfunc4 docs',
});
