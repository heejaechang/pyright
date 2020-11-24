/// <reference path="fourslash.ts" />
// @indexerwithoutstdlib: true

// @filename: mspythonconfig.json
//// {
////   "completeFunctionParens": true
//// }

// @filename: test1.py
//// import scipy
////
//// [|method/*marker1*/|]

// @filename: test2.py
//// import scipy.submodule
////
//// [|method/*marker2*/|]

// @filename: test3.py
//// import scipy as sp
////
//// [|method/*marker3*/|]

// @filename: test4.py
//// import scipy.submodule as ss
////
//// [|method/*marker4*/|]

// @filename: test5.py
//// import scipy
////
//// [|sp/*marker5*/|]

// @filename: test6.py
//// import scipy.submodule
////
//// [|ss/*marker6*/|]

// @filename: test7.py
//// import scipy[|/*import7*/|]
////
//// [|method2/*marker7*/|]

// @filename: test8.py
//// import scipy as pp
////
//// [|sp/*marker8*/|]

// @filename: test9.py
//// import scipy as sp
////
//// [|scipy/*marker9*/|]

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
                        documentation: '```\nfrom scipy import method1\n```',
                        detail: 'Auto-import',
                        textEdit: { range: helper.getPositionRange('marker1'), newText: 'scipy.method1($0)' },
                    },
                ],
            },
            marker2: {
                completions: [
                    {
                        label: 'method2',
                        kind: Consts.CompletionItemKind.Function,
                        documentation: '```\nfrom scipy.submodule import method2\n```',
                        detail: 'Auto-import',
                        textEdit: { range: helper.getPositionRange('marker2'), newText: 'scipy.submodule.method2($0)' },
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
                        textEdit: { range: helper.getPositionRange('marker3'), newText: 'sp.method1($0)' },
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
                        textEdit: { range: helper.getPositionRange('marker4'), newText: 'ss.method2($0)' },
                    },
                ],
            },
            marker7: {
                completions: [
                    {
                        // auto-import doesn't support finding submodule from parent module
                        label: 'method2',
                        kind: Consts.CompletionItemKind.Function,
                        documentation: '```\nfrom scipy.submodule import method2\n```',
                        detail: 'Auto-import',
                        textEdit: { range: helper.getPositionRange('marker7'), newText: 'method2($0)' },
                        additionalTextEdits: [
                            {
                                range: helper.getPositionRange('import7'),
                                newText: '\nfrom scipy.submodule import method2',
                            },
                        ],
                    },
                ],
            },
            marker9: {
                completions: [
                    {
                        // auto-import doesn't support finding submodule from parent module
                        label: 'scipy',
                        kind: Consts.CompletionItemKind.Module,
                        documentation: '```\nimport scipy\n```',
                        detail: 'Auto-import',
                        textEdit: { range: helper.getPositionRange('marker9'), newText: 'sp' },
                    },
                ],
            },
        },
        { sp: { importName: 'scipy' } }
    );

    // @ts-ignore
    await helper.verifyCompletion(
        'excluded',
        'markdown',
        {
            marker5: { completions: [{ label: 'sp', kind: undefined }] },
            marker6: { completions: [{ label: 'ss', kind: undefined }] },
            marker8: { completions: [{ label: 'sp', kind: undefined }] },
        },
        { sp: { importName: 'scipy' }, ss: { importName: 'submodule', importFrom: 'scipy' } }
    );
}
