/// <reference path="fourslash.ts" />
// @indexerwithoutstdlib: true

// @filename: mspythonconfig.json
//// {
////   "completeFunctionParens": true
//// }

// @filename: test1.py
//// from userFiles1 import method1
////
//// [|method/*marker1*/|]

// @filename: test2.py
//// from nested.userFiles2 import method2
////
//// [|method/*marker2*/|]

// @filename: test3.py
//// from userFiles1 import method1 as m1
////
//// [|method1/*marker3*/|]

// @filename: test4.py
//// from nested.userFiles2 import method2 as m2
////
//// [|method2/*marker4*/|]

// @filename: test5.py
//// from nested import userFiles2
////
//// [|nu/*marker5*/|]

// @filename: test6.py
//// from userFiles1 import method1
////
//// [|uf/*marker6*/|]

// @filename: nested/test7.py
//// from ..userFiles1 import method1[|/*import7*/|]
////
//// [|method3/*marker7*/|]

// @filename: test8.py
//// from .userFiles1 import method1[|/*import8*/|]
////
//// [|method3/*marker8*/|]

// @filename: userFiles1.py
//// def method1(): ...
//// def method3(): ...

// @filename: nested/userFiles2.py
//// def method2(): ...

{
    helper.openFiles(helper.getMarkers().map((m) => m.fileName));

    // @ts-ignore
    await helper.verifyCompletion('included', 'markdown', {
        marker1: {
            completions: [
                {
                    label: 'method1',
                    kind: Consts.CompletionItemKind.Function,
                    documentation: '```python\nmethod1: () -> None\n```\n',
                    insertionText: 'method1($0)',
                },
            ],
        },
        marker2: {
            completions: [
                {
                    label: 'method2',
                    kind: Consts.CompletionItemKind.Function,
                    documentation: '```python\nmethod2: () -> None\n```\n',
                    insertionText: 'method2($0)',
                },
            ],
        },
        marker3: {
            completions: [
                {
                    label: 'method1',
                    kind: Consts.CompletionItemKind.Function,
                    documentation: '```\nfrom userFiles1 import method1\n```',
                    detail: 'Auto-import',
                    textEdit: { range: helper.getPositionRange('marker3'), newText: 'm1($0)' },
                },
            ],
        },
        marker4: {
            completions: [
                {
                    label: 'method2',
                    kind: Consts.CompletionItemKind.Function,
                    documentation: '```\nfrom nested.userFiles2 import method2\n```',
                    detail: 'Auto-import',
                    textEdit: { range: helper.getPositionRange('marker4'), newText: 'm2($0)' },
                },
            ],
        },
        marker7: {
            completions: [
                {
                    label: 'method3',
                    kind: Consts.CompletionItemKind.Function,
                    documentation: '```\nfrom ..userFiles1 import method3\n```',
                    detail: 'Auto-import',
                    textEdit: { range: helper.getPositionRange('marker7'), newText: 'method3($0)' },
                    additionalTextEdits: [{ range: helper.getPositionRange('import7'), newText: ', method3' }],
                },
            ],
        },
        marker8: {
            completions: [
                {
                    label: 'method3',
                    kind: Consts.CompletionItemKind.Function,
                    documentation: '```\nfrom .userFiles1 import method3\n```',
                    detail: 'Auto-import',
                    textEdit: { range: helper.getPositionRange('marker8'), newText: 'method3($0)' },
                    additionalTextEdits: [
                        {
                            range: helper.getPositionRange('import8'),
                            newText: ', method3',
                        },
                    ],
                },
            ],
        },
    });

    // @ts-ignore
    await helper.verifyCompletion(
        'excluded',
        'markdown',
        {
            marker5: { completions: [{ label: 'nu', kind: undefined }] },
            marker6: { completions: [{ label: 'uf', kind: undefined }] },
        },
        { uf: { importName: 'userFiles1.py' }, nu: { importName: 'userFiles2.py', importFrom: 'nested' } }
    );
}
