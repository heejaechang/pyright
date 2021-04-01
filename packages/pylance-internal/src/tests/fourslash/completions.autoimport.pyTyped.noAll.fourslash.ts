/// <reference path="fourslash.ts" />
// @indexerwithoutstdlib: true

// @filename: test1.py
//// [|/*import1*/|][|TestType1/*marker1*/|]

// @filename: testLib/py.typed
// @library: true
//// # empty

// @filename: testLib/__init__.py
// @library: true
//// from testLib2 import TestType1 as TestType1

// @filename: testLib2/__init__.py
// @library: true
//// class TestType1:
////     pass

{
    helper.openFiles(helper.getMarkers().map((m) => m.fileName));

    // @ts-ignore
    await helper.verifyCompletion('included', 'markdown', {
        marker1: {
            completions: [
                {
                    label: 'TestType1',
                    kind: Consts.CompletionItemKind.Class,
                    documentation: '```\nfrom testLib import TestType1\n```',
                    detail: 'Auto-import',
                    textEdit: { range: helper.getPositionRange('marker1'), newText: 'TestType1' },
                    additionalTextEdits: [
                        {
                            range: helper.getPositionRange('import1'),
                            newText: 'from testLib import TestType1\n\n\n',
                        },
                    ],
                },
            ],
        },
    });
}
