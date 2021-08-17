/// <reference path="fourslash.ts" />

// @filename: pyrightconfig.json
//// {
////   "reportUnusedImport": true
//// }

// @filename: test1.py
//// [|/*result1*/import [|/*marker1*/os|]; |]import sys;

// @filename: test2.py
//// import os; [|/*result2*/import [|/*marker2*/sys|];|]

// @filename: test3.py
//// import os; [|/*result3*/import [|/*marker3*/sys|];
//// |]

// @filename: test4.py
//// import os; import [|/*result4*/[|/*marker4*/sys|], |]cgi;
////
//// cgi

// @filename: test5.py
//// [|/*result5*/import [|/*marker5*/os|]; |]print("hello");

// @filename: test6.py
//// print("there");[|/*result6*/import [|/*marker6*/os|]; |]print("hello");

{
    // @ts-ignore
    await helper.verifyInvokeCodeAction({
        marker1: { title: 'Remove unused import', edits: [{ range: helper.getPositionRange('result1'), newText: '' }] },
        marker2: { title: 'Remove unused import', edits: [{ range: helper.getPositionRange('result2'), newText: '' }] },
        marker3: { title: 'Remove unused import', edits: [{ range: helper.getPositionRange('result3'), newText: '' }] },
        marker4: { title: 'Remove unused import', edits: [{ range: helper.getPositionRange('result4'), newText: '' }] },
        marker5: { title: 'Remove unused import', edits: [{ range: helper.getPositionRange('result5'), newText: '' }] },
        marker6: { title: 'Remove unused import', edits: [{ range: helper.getPositionRange('result6'), newText: '' }] },
    });
}
