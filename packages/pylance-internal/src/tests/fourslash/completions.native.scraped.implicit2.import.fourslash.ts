/// <reference path="fourslash.ts" />

// @filename: mspythonconfig.json
//// {
////   "useLibraryCodeForTypes": true
//// }

// @filename: test.py
//// from lxml import etree
//// etree.[|/*marker*/|]

// @filename: lxml/__init__.py
// @library: true
//// # empty

// @filename: lxml/etree.cp36-win_amd64.pyd
// @library: true
//// x = 1

// @filename: bundled/native-stubs/lxml/etree.pyi
//// def parse():
////     'beta documentation'
////     ...

// @ts-ignore
await helper.verifyCompletion('included', 'markdown', {
    marker: {
        completions: [
            {
                label: 'parse',
                kind: Consts.CompletionItemKind.Function,
                documentation: '```python\nparse: () -> Unknown\n```\n---\nbeta documentation',
            },
        ],
    },
});
