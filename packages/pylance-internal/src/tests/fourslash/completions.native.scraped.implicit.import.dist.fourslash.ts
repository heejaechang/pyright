/// <reference path="fourslash.ts" />

// @filename: test.py
//// import testnumpy as np
//// np.random.[|/*marker*/|]

// @filename: testnumpy/__init__.py
// @distlibrary: true
//// from .random import *

// @filename: testnumpy/random/__init__.py
// @distlibrary: true
//// from .mtrand import *

// @filename: testnumpy/random/mtrand.cp36-win_amd64.pyd
// @distlibrary: true
//// x = 1

// @filename: bundled/native-stubs/testnumpy/random/mtrand.pyi
////def beta(a:int, b:int, size:int):
////    'beta documentation'
////    ...

// @ts-ignore
await helper.verifyCompletion('included', 'markdown', {
    marker: {
        completions: [
            {
                label: 'beta',
                kind: Consts.CompletionItemKind.Function,
                documentation: '```python\nbeta: (a: int, b: int, size: int) -> Unknown\n```\n---\nbeta documentation',
            },
        ],
    },
});
