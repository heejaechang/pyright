/// <reference path="fourslash.ts" />

// @filename: mspythonconfig.json
//// {
////   "useLibraryCodeForTypes": true
//// }

// @filename: foo/__init__.py
// @library: true
//// class Foo:
////    pass

// @filename: test.py
//// import foo
//// import os as foo
//// [|/*marker*/foo|] = 3
//// def foo(): pass

// one of the declarations is from site-packages, so do not rename
helper.verifyRename({
    marker: {
        newName: 'foo1',
        changes: [],
    },
});
