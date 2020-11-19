/// <reference path="fourslash.ts" />
// @indexerwithoutstdlib: true

// @filename: mspythonconfig.json
//// {
////   "completeFunctionParens": true
//// }

// @filename: test1.py
//// [|/*import1*/|][|met/*marker1*/|]hod

// @filename: test2.py
//// [|/*import2*/|][|met/*marker2*/|]hod()

// @filename: test3.py
//// [|/*marker3*/|]method

// @filename: test4.py
//// [|/*marker4*/|]method()

// @filename: test5.py
//// def helper():
////     pass
////
//// [|hel/*marker5*/|]per

// @filename: test6.py
//// def helper():
////     pass
////
//// [|hel/*marker6*/|]per()

// @filename: test7.py
//// def helper():
////     pass
////
//// [|/*marker7*/|]helper

// @filename: test8.py
//// def helper():
////     pass
////
//// [|/*marker8*/|]helper()

// @filename: testLib/__init__.py
// @library: true
//// def method():
////     pass
////
//// __all__ = ['method']

{
    helper.openFiles(helper.getMarkers().map((m) => m.fileName));

    const import1Range = helper.getPositionRange('import1');
    const marker1Range = helper.getPositionRange('marker1');

    const import2Range = helper.getPositionRange('import2');
    const marker2Range = helper.getPositionRange('marker2');

    // @ts-ignore
    await helper.verifyCompletion('included', 'markdown', {
        marker1: {
            completions: [
                {
                    label: 'method',
                    kind: Consts.CompletionItemKind.Function,
                    documentation: '```\nfrom testLib import method\n```',
                    detail: 'Auto-import',
                    textEdit: { range: marker1Range, newText: 'method($0)' },
                    additionalTextEdits: [{ range: import1Range, newText: 'from testLib import method\n\n\n' }],
                },
            ],
        },
        marker2: {
            completions: [
                {
                    label: 'method',
                    kind: Consts.CompletionItemKind.Function,
                    documentation: '```\nfrom testLib import method\n```',
                    detail: 'Auto-import',
                    textEdit: { range: marker2Range, newText: 'method($0)' },
                    additionalTextEdits: [{ range: import2Range, newText: 'from testLib import method\n\n\n' }],
                },
            ],
        },
        marker5: {
            completions: [
                {
                    label: 'helper',
                    kind: Consts.CompletionItemKind.Function,
                    insertionText: 'helper($0)',
                },
            ],
        },
        marker6: {
            completions: [
                {
                    label: 'helper',
                    kind: Consts.CompletionItemKind.Function,
                    insertionText: 'helper($0)',
                },
            ],
        },
        marker7: {
            completions: [
                {
                    label: 'helper',
                    kind: Consts.CompletionItemKind.Function,
                    insertionText: 'helper($0)',
                },
            ],
        },
        marker8: {
            completions: [
                {
                    label: 'helper',
                    kind: Consts.CompletionItemKind.Function,
                    insertionText: 'helper($0)',
                },
            ],
        },
    });

    // @ts-ignore
    await helper.verifyCompletion('excluded', 'markdown', {
        // auto-import is not included if there is no filtering word
        marker3: { completions: [{ label: 'method', kind: undefined }] },
        marker4: { completions: [{ label: 'method', kind: undefined }] },
    });
}
