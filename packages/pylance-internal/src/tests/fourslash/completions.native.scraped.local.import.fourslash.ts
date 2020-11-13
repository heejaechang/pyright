/// <reference path="fourslash.ts" />

// @filename: mspythonconfig.json
//// {
////   "useLibraryCodeForTypes": true
//// }

// @filename: test.py
//// import testnumpy as np
//// np.random.[|/*marker*/|]

// @filename: testnumpy/__init__.py
//// from .random import *

// @filename: testnumpy/random/__init__.py
//// from .mtrand import *

// @filename: testnumpy/random/mtrand.cp36-win_amd64.so
//// x = 1

// @filename: bundled/native-stubs/testnumpy/random/mtrand.pyi
////def beta(a:int, b:int, size:int):
////    'beta documentation'
////    ...

// @ts-ignore
await helper.verifyCompletion('excluded', 'markdown', {
    marker: {
        completions: [
            {
                label: 'x',
                kind: Consts.CompletionItemKind.Variable,
            },
            {
                label: 'beta',
                kind: Consts.CompletionItemKind.Function,
            },
        ],
    },
});
