/// <reference path="fourslash.ts" />
// @indexerwithoutstdlib: true

// @filename: lib/__init__.pyi
// @library: true
//// class A: ...
//// class B: ...
//// __all__ = [ "A" ]

// @filename: test1.py
//// from lib import *[|/*import*/|]
////
//// [|B/*marker*/|]

{
    helper.openFiles(helper.getMarkers().map((m) => m.fileName));

    // @ts-ignore
    await helper.verifyCompletion('included', 'markdown', {
        marker: {
            completions: [
                {
                    label: 'B',
                    kind: Consts.CompletionItemKind.Class,
                    documentation: '```\nfrom lib import B\n```',
                    detail: 'Auto-import',
                    textEdit: { range: helper.getPositionRange('marker'), newText: 'B' },
                    additionalTextEdits: [{ range: helper.getPositionRange('import'), newText: '\nfrom lib import B' }],
                },
            ],
        },
    });
}
