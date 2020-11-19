/// <reference path="fourslash.ts" />
// @indexerwithoutstdlib: true

// @filename: test1.py
//// [|/*import*/|][|MyShadow/*marker*/|]

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

{
    const importRange = helper.getPositionRange('import');
    const markerRange = helper.getPositionRange('marker');

    // @ts-ignore
    await helper.verifyCompletion('exact', 'markdown', {
        marker: {
            completions: [
                {
                    label: 'MyShadow',
                    kind: Consts.CompletionItemKind.Class,
                    documentation: '```\nfrom testLib import MyShadow\n```',
                    detail: 'Auto-import',
                    textEdit: { range: markerRange, newText: 'MyShadow' },
                    additionalTextEdits: [{ range: importRange, newText: 'from testLib import MyShadow\n\n\n' }],
                },
            ],
        },
    });
}
