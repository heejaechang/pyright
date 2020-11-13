/// <reference path="fourslash.ts" />

// @filename: mspythonconfig.json
//// {
////   "useLibraryCodeForTypes": true
//// }

// @filename: test.py
//// import testnumpy as np
//// np.[|/*marker*/|]

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

// @filename: bundled/native-stubs/testnumpy/core/_multiarray_umath.pyi
//// class ndarray():
////   'ndarray(shape, dtype=float, buffer=None)'
////   ...

// @ts-ignore
await helper.verifyCompletion('included', 'markdown', {
    marker: {
        completions: [
            {
                label: 'ndarray',
                kind: Consts.CompletionItemKind.Class,
                documentation: '```python\nclass ndarray()\n```\n---\nndarray(shape, dtype=float, buffer=None)',
            },
        ],
    },
});
