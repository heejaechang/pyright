/// <reference path="fourslash.ts" />
// @indexerwithoutstdlib: true

// @filename: test1.py
//// [|/*import*/|][|Test/*marker*/|]

// @filename: testLib/__init__.py
// @library: true
//// class Test:
////     pass
////
//// __all__ = ['Test']

{
    const importRange = helper.getPositionRange('import');
    const markerRange = helper.getPositionRange('marker');

    // @ts-ignore
    await helper.verifyCompletion('included', 'markdown', {
        marker: {
            completions: [
                {
                    label: 'Test',
                    kind: Consts.CompletionItemKind.Class,
                    documentation: '```\nfrom testLib import Test\n```',
                    detail: 'Auto-import',
                    textEdit: { range: markerRange, newText: 'Test' },
                    additionalTextEdits: [{ range: importRange, newText: 'from testLib import Test\n\n\n' }],
                },
            ],
        },
    });
}
