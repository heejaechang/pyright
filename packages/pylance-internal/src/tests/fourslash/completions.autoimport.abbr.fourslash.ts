/// <reference path="fourslash.ts" />
// @indexer: true

// @filename: test1.py
//// [|/*import*/|][|np/*marker1*/|]
////
//// [|plt/*marker2*/|]
////
//// [|sp/*marker3*/|]
////
//// [|m/*marker4*/|]

// @filename: numpy/__init__.pyi
// @library: true
//// class Dummy: ...

// @filename: numpy/__init__.py
// @library: true
//// # stub file is backed up by py

// @filename: matplotlib/__init__.py
// @library: true
//// # backing up py file

// @filename: matplotlib/pyplot.py
// @library: true
//// # backing up py file

{
    const importRange = helper.getPositionRange('import');
    const marker1Range = helper.getPositionRange('marker1');
    const marker2Range = helper.getPositionRange('marker2');

    // @ts-ignore
    await helper.verifyCompletion(
        'included',
        'markdown',
        {
            marker1: {
                completions: [
                    {
                        label: 'np',
                        kind: Consts.CompletionItemKind.Module,
                        documentation: '```\nimport numpy as np\n```',
                        detail: 'Auto-import',
                        textEdit: { range: marker1Range, newText: 'np' },
                        additionalTextEdits: [{ range: importRange, newText: 'import numpy as np\n\n\n' }],
                    },
                ],
            },
            marker2: {
                completions: [
                    {
                        label: 'plt',
                        kind: Consts.CompletionItemKind.Module,
                        documentation: '```\nfrom matplotlib import pyplot as plt\n```',
                        detail: 'Auto-import',
                        textEdit: { range: marker2Range, newText: 'plt' },
                        additionalTextEdits: [
                            { range: importRange, newText: 'from matplotlib import pyplot as plt\n\n\n' },
                        ],
                    },
                ],
            },
        },
        // matplotlib is in our bundled-stub. having py in test will make them light up by indexing.
        { np: { importName: 'numpy' }, plt: { importName: 'pyplot', importFrom: 'matplotlib' } }
    );

    // @ts-ignore
    await helper.verifyCompletion(
        'excluded',
        'markdown',
        {
            marker3: {
                completions: [{ label: 'sp', kind: undefined }],
            },
            marker4: {
                completions: [{ label: 'm', kind: undefined }],
            },
        },
        // Library that isn't installed or the alias is too short.
        { sp: { importName: 'scipy' }, m: { importName: 'math' } }
    );
}
