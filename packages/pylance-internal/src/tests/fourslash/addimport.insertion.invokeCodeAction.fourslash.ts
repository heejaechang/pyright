/// <reference path="fourslash.ts" />
// @indexer: true

// @filename: test1.py
//// [|/*insert1*/|][|/*marker1*/os|]
//// import gc[|/*insert2*/|]
//// [|/*marker2*/sys|]

{
    const insert1Range = helper.getPositionRange('insert1');
    const marker1Range = helper.getPositionRange('marker1');

    const insert2Range = helper.getPositionRange('insert2');
    const marker2Range = helper.getPositionRange('marker2');

    // @ts-ignore
    await helper.verifyInvokeCodeAction({
        marke1r: {
            title: 'Add import os',
            edits: [
                { range: insert1Range, newText: 'import os\n\n\n' },
                { range: marker1Range, newText: 'os' },
            ],
        },
        marker2: {
            title: 'Add import sys',
            edits: [
                { range: insert2Range, newText: '\nimport sys' },
                { range: marker2Range, newText: 'sys' },
            ],
        },
    });
}
