/// <reference path="fourslash.ts" />

// @filename: mspythonconfig.json
//// {
////   "useLibraryCodeForTypes": true
//// }

// @filename: test.py
//// import testnumpy.core._multiarray_umath as mu
//// mu.[|/*marker*/|]

// @filename: testnumpy/__init__.py
// @library: true
//// from .core import *

// @filename: testnumpy/core/__init__.py
// @library: true
//// from .multiarray import *

// @filename: testnumpy/core/multiarray.py
// @library: true
//// from testnumpy.core._multiarray_umath import *

// @filename: testnumpy/core/_multiarray_umath.cp36-win_amd64.dylib
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
