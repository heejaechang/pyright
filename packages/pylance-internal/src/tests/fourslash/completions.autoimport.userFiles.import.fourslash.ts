/// <reference path="fourslash.ts" />
// @indexerwithoutstdlib: true

// @filename: mspythonconfig.json
//// {
////   "completeFunctionParens": true
//// }

// @filename: test1.py
//// import userFiles1
////
//// [|method/*marker1*/|]

// @filename: test2.py
//// import nested.userFiles2
////
//// [|method/*marker2*/|]

// @filename: test3.py
//// import userFiles1 as uf
////
//// [|method/*marker3*/|]

// @filename: test4.py
//// import nested.userFiles2 as nu
////
//// [|method/*marker4*/|]

// @filename: test5.py
//// import userFiles1
////
//// [|uf/*marker5*/|]

// @filename: test6.py
//// import nested.userFiles2
////
//// [|nu/*marker6*/|]

// @filename: test7.py
//// [|/*import7*/|]import userFiles1
////
//// [|method2/*marker7*/|]

// @filename: test8.py
//// import userFiles1 as uu
////
//// [|uf/*marker8*/|]

// @filename: userFiles1.py
//// def method1(): ...

// @filename: nested/userFiles2.py
//// def method2(): ...

{
    helper.openFiles(helper.getMarkers().map((m) => m.fileName));

    // @ts-ignore
    await helper.verifyCompletion(
        'included',
        'markdown',
        {
            marker1: {
                completions: [
                    {
                        label: 'method1',
                        kind: Consts.CompletionItemKind.Function,
                        documentation: '```\nfrom userFiles1 import method1\n```',
                        detail: 'Auto-import',
                        textEdit: { range: helper.getPositionRange('marker1'), newText: 'userFiles1.method1($0)' },
                    },
                ],
            },
            marker2: {
                completions: [
                    {
                        label: 'method2',
                        kind: Consts.CompletionItemKind.Function,
                        documentation: '```\nfrom nested.userFiles2 import method2\n```',
                        detail: 'Auto-import',
                        textEdit: {
                            range: helper.getPositionRange('marker2'),
                            newText: 'nested.userFiles2.method2($0)',
                        },
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
                        textEdit: { range: helper.getPositionRange('marker3'), newText: 'uf.method1($0)' },
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
                        textEdit: { range: helper.getPositionRange('marker4'), newText: 'nu.method2($0)' },
                    },
                ],
            },
            marker7: {
                completions: [
                    {
                        // auto-import doesn't support finding submodule from parent module
                        label: 'method2',
                        kind: Consts.CompletionItemKind.Function,
                        documentation: '```\nfrom nested.userFiles2 import method2\n```',
                        detail: 'Auto-import',
                        textEdit: { range: helper.getPositionRange('marker7'), newText: 'method2($0)' },
                        additionalTextEdits: [
                            {
                                range: helper.getPositionRange('import7'),
                                newText: 'from nested.userFiles2 import method2\n',
                            },
                        ],
                    },
                ],
            },
        },
        { uf: { importName: 'userFiles1.py' }, nu: { importName: 'userFiles2.py', importFrom: 'nested' } }
    );

    // @ts-ignore
    await helper.verifyCompletion(
        'excluded',
        'markdown',
        {
            marker5: { completions: [{ label: 'uf', kind: undefined }] },
            marker6: { completions: [{ label: 'nu', kind: undefined }] },
            marker8: { completions: [{ label: 'uf', kind: undefined }] },
        },
        { uf: { importName: 'userFiles1.py' }, nu: { importName: 'userFiles2.py', importFrom: 'nested' } }
    );
}
