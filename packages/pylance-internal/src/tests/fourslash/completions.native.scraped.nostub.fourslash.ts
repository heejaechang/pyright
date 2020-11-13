/// <reference path="fourslash.ts" />

// @filename: mspythonconfig.json
//// {
////   "useLibraryCodeForTypes": true
//// }

// @filename: test.py
//// import testlib as t
//// t.mod.[|/*marker*/|]

// @filename: testlib/__init__.py
// @library: true
//// from .mod import *

// @filename: testlib/mod/__init__.py
// @library: true
//// from .compiled import *

// @filename: testlib/mod/compiled.cp36-win_amd64.pyd
// @library: true
//// x = 1

// @ts-ignore
await helper.verifyCompletion('excluded', 'markdown', {
    marker: {
        completions: [
            {
                label: 'x',
                kind: Consts.CompletionItemKind.Variable,
            },
        ],
    },
});
helper.verifyDiagnostics({
    marker: { category: 'error', message: 'Expected member name after "."' },
});
