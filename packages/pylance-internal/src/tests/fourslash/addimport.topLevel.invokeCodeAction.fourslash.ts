/// <reference path="fourslash.ts" />

// @filename: mspythonconfig.json
//// {
////   "typeCheckingMode ": "basic"
//// }

// @filename: test1.py
//// [|/*result*/|]a = [|/*marker1*/os|]
//// b = [|/*marker2*/sys|]

// @filename: test2.py
//// import os
//// import sys
//// a = os.path
//// b = sys.path

{
    const resultRange = helper.getPositionRange('result');
    const marker1Range = helper.getPositionRange('marker1');
    const marker2Range = helper.getPositionRange('marker2');

    // @ts-ignore
    await helper.verifyInvokeCodeAction({
        marke1r: {
            title: 'Add import os',
            edits: [
                { range: resultRange, newText: 'import os\n\n\n' },
                { range: marker1Range, newText: 'os' },
            ],
        },
        marker2: {
            title: 'Add import sys',
            edits: [
                { range: resultRange, newText: 'import sys\n\n\n' },
                { range: marker2Range, newText: 'sys' },
            ],
        },
    });
}
