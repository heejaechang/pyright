/// <reference path="fourslash.ts" />
// @indexerwithoutstdlib: true

// @filename: mspythonconfig.json
//// {
////   "completeFunctionParens": true
//// }

// @filename: test1.py
//// from scipy import method1
////
//// [|method/*marker1*/|]

// @filename: test2.py
//// from scipy.submodule import method2
////
//// [|method/*marker2*/|]

// @filename: test3.py
//// from scipy import method1 as m1
////
//// [|method1/*marker3*/|]

// @filename: test4.py
//// from scipy.submodule import method2 as m2
////
//// [|method2/*marker4*/|]

// @filename: test5.py
//// from scipy import submodule
////
//// [|ss/*marker5*/|]

// @filename: test6.py
//// from scipy import method1
////
//// [|sp/*marker6*/|]

// @filename: test7.py
//// from scipy import method1[|/*import7*/|]
////
//// [|submodule/*marker7*/|]

// @filename: test8.py
//// from scipy import method1[|/*import8*/|]
////
//// [|ss/*marker8*/|]

// @filename: test9.py
//// from scipy import submodule as ss
////
//// [|submodule/*marker9*/|]

// @filename: test10.py
//// from scipy import submodule
////
//// [|method2/*marker10*/|]

// @filename: test11.py
//// from scipy import submodule as ss
////
//// [|method2/*marker11*/|]

// @filename: scipy/__init__.pyi
// @library: true
//// def method1(): ...

// @filename: scipy/submodule.pyi
// @library: true
//// def method2(): ...

// @filename: scipy/__init__.py
// @library: true
//// # stub file is backed up by py

// @filename: scipy/submodule.py
// @library: true
//// # stub file is backed up by py

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
                        documentation: '```python\nmethod1: () -> Unknown\n```',
                        insertionText: 'method1($0)',
                    },
                ],
            },
            marker2: {
                completions: [
                    {
                        label: 'method2',
                        kind: Consts.CompletionItemKind.Function,
                        documentation: '```python\nmethod2: () -> Unknown\n```',
                        insertionText: 'method2($0)',
                    },
                ],
            },
            marker3: {
                completions: [
                    {
                        label: 'method1',
                        kind: Consts.CompletionItemKind.Function,
                        documentation: '```\nfrom scipy import method1\n```',
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
                        documentation: '```\nfrom scipy.submodule import method2\n```',
                        detail: 'Auto-import',
                        textEdit: { range: helper.getPositionRange('marker4'), newText: 'm2($0)' },
                    },
                ],
            },
            marker7: {
                completions: [
                    {
                        label: 'submodule',
                        kind: Consts.CompletionItemKind.Module,
                        documentation: '```\nfrom scipy import submodule\n```',
                        detail: 'Auto-import',
                        textEdit: { range: helper.getPositionRange('marker7'), newText: 'submodule' },
                        additionalTextEdits: [{ range: helper.getPositionRange('import7'), newText: ', submodule' }],
                    },
                ],
            },
            marker8: {
                completions: [
                    {
                        label: 'ss',
                        kind: Consts.CompletionItemKind.Module,
                        documentation: '```\nfrom scipy import submodule as ss\n```',
                        detail: 'Auto-import',
                        textEdit: { range: helper.getPositionRange('marker8'), newText: 'ss' },
                        additionalTextEdits: [
                            { range: helper.getPositionRange('import8'), newText: ', submodule as ss' },
                        ],
                    },
                ],
            },
            marker9: {
                completions: [
                    {
                        label: 'submodule',
                        kind: Consts.CompletionItemKind.Module,
                        documentation: '```\nfrom scipy import submodule\n```',
                        detail: 'Auto-import',
                        textEdit: { range: helper.getPositionRange('marker9'), newText: 'ss' },
                    },
                ],
            },
            marker10: {
                completions: [
                    {
                        label: 'method2',
                        kind: Consts.CompletionItemKind.Function,
                        documentation: '```\nfrom scipy.submodule import method2\n```',
                        detail: 'Auto-import',
                        textEdit: { range: helper.getPositionRange('marker10'), newText: 'submodule.method2($0)' },
                    },
                ],
            },
            marker11: {
                completions: [
                    {
                        label: 'method2',
                        kind: Consts.CompletionItemKind.Function,
                        documentation: '```\nfrom scipy.submodule import method2\n```',
                        detail: 'Auto-import',
                        textEdit: { range: helper.getPositionRange('marker11'), newText: 'ss.method2($0)' },
                    },
                ],
            },
        },
        { sp: { importName: 'scipy' }, ss: { importName: 'submodule', importFrom: 'scipy' } }
    );

    // @ts-ignore
    await helper.verifyCompletion(
        'excluded',
        'markdown',
        {
            marker5: { completions: [{ label: 'ss', kind: undefined }] },
            marker6: { completions: [{ label: 'sp', kind: undefined }] },
        },
        { sp: { importName: 'scipy' }, ss: { importName: 'submodule', importFrom: 'scipy' } }
    );
}
