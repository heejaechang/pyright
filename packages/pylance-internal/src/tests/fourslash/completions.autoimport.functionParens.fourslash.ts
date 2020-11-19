/// <reference path="fourslash.ts" />
// @indexerwithoutstdlib: true

// @filename: mspythonconfig.json
//// {
////   "completeFunctionParens": true
//// }

// @filename: test1.py
//// [|/*import*/|][|method/*marker*/|]

// @filename: testLib/__init__.py
// @library: true
//// def method():
////     pass
////
//// __all__ = ['method']

{
    const importRange = helper.getPositionRange('import');
    const markerRange = helper.getPositionRange('marker');

    // @ts-ignore
    await helper.verifyCompletion('included', 'markdown', {
        marker: {
            completions: [
                {
                    label: 'method',
                    kind: Consts.CompletionItemKind.Function,
                    documentation: '```\nfrom testLib import method\n```',
                    detail: 'Auto-import',
                    textEdit: { range: markerRange, newText: 'method($0)' },
                    additionalTextEdits: [{ range: importRange, newText: 'from testLib import method\n\n\n' }],
                },
            ],
        },
    });
}
