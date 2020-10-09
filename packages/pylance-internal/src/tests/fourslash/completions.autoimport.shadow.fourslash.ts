/// <reference path="fourslash.ts" />
// @indexerwithoutstdlib: true

// @filename: test1.py
//// MyShadow[|/*marker*/|]

// @filename: testLib/__init__.pyi
// @library: true
//// class MyShadow:
////     def method(): ...

// @filename: testLib/__init__.py
// @library: true
//// class MyShadow:
////     def method():
////         'doc string'
////         pass

// @ts-ignore
await helper.verifyCompletion('exact', 'markdown', {
    marker: {
        completions: [
            {
                label: 'MyShadow',
                documentation: '```\nfrom testLib import MyShadow\n```',
                detail: 'Auto-import',
            },
        ],
    },
});
