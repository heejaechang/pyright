/// <reference path="fourslash.ts" />

// @filename: mspythonconfig.json
//// {
////   "completeFunctionParens": true
//// }

// @filename: base.py
//// class A:
////     def method(self):
////         pass
////     def method2(self):
////         pass

// @filename: test.py
//// from base import A
////
//// class B(A):
////     def [|m/*marker1*/|]

// @filename: test2.py
//// from base import A
////
//// class B(A):
////     def [|me/*marker2*/th|]

// @filename: test3.py
//// from base import A
////
//// class B(A):
////     def [|me/*marker3*/thod|]():
////         pass

{
    helper.openFiles(helper.getMarkers().map((m) => m.fileName));

    const marker1Range = helper.getPositionRange('marker1');
    const marker2Range = helper.getPositionRange('marker2');

    // @ts-ignore
    await helper.verifyCompletion('included', 'markdown', {
        marker1: {
            completions: [
                {
                    label: 'method',
                    kind: Consts.CompletionItemKind.Method,
                    textEdit: { range: marker1Range, newText: 'method(self):' },
                },
                {
                    label: 'method2',
                    kind: Consts.CompletionItemKind.Method,
                    textEdit: { range: marker1Range, newText: 'method2(self):' },
                },
            ],
        },
        marker2: {
            completions: [
                {
                    label: 'method',
                    kind: Consts.CompletionItemKind.Method,
                    textEdit: { range: marker2Range, newText: 'method(self):' },
                },
                {
                    label: 'method2',
                    kind: Consts.CompletionItemKind.Method,
                    textEdit: { range: marker2Range, newText: 'method2(self):' },
                },
            ],
        },
    });

    // @ts-ignore
    await helper.verifyCompletion('exact', 'markdown', {
        marker3: {
            completions: [],
        },
    });
}
