/// <reference path="fourslash.ts" />

// @filename: mspythonconfig.json
//// {
////   "typeCheckingMode ": "basic"
//// }

// @filename: test1.py
//// [|/*result*/|]a = [|/*marker*/np|].array

// @filename: test2.py
//// import numpy
//// a = numpy.array

// @filename: numpy/__init__.pyi
// @library: true
//// class array:
////     pass

{
    const resultRange = helper.getPositionRange('result');
    const markerRange = helper.getPositionRange('marker');

    // @ts-ignore
    await helper.verifyInvokeCodeAction({
        marker: {
            title: 'Add import numpy as np',
            edits: [
                { range: resultRange, newText: 'import numpy as np\n\n\n' },
                { range: markerRange, newText: 'np' },
            ],
        },
    });
}
