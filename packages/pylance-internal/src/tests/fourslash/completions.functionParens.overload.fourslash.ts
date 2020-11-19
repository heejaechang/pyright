/// <reference path="fourslash.ts" />

// @filename: mspythonconfig.json
//// {
////   "completeFunctionParens": true
//// }

// @filename: test.py
//// class A:
////     @overload
////     def method(self):
////         pass
////     @overload
////     def [|m/*marker*/|]

// @filename: test1.py
//// class A:
////     @overload
////     def method(self):
////         pass
////     @overload
////     def [|me/*marker1*/th|]

// @filename: test2.py
//// class A:
////     @overload
////     def method(self):
////         pass
////     @overload
////     def [|me/*marker2*/th|]():
////         pass

// @filename: test3.py
//// @overload
//// def method(self):
////     pass
//// @overload
//// def [|m/*marker3*/|]

// @filename: test4.py
//// @overload
//// def method(self):
////     pass
//// @overload
//// def [|me/*marker4*/th|]

// @filename: test5.py
//// @overload
//// def method(self):
////     pass
//// @overload
//// def [|me/*marker5*/th|]():
////     pass

{
    helper.openFiles(helper.getMarkers().map((m) => m.fileName));

    const markerRange = helper.getPositionRange('marker');
    const marker1Range = helper.getPositionRange('marker1');
    const marker2Range = helper.getPositionRange('marker2');
    const marker3Range = helper.getPositionRange('marker3');
    const marker4Range = helper.getPositionRange('marker4');
    const marker5Range = helper.getPositionRange('marker5');

    // @ts-ignore
    await helper.verifyCompletion('included', 'markdown', {
        marker: {
            completions: [
                {
                    label: 'method',
                    kind: Consts.CompletionItemKind.Method,
                    textEdit: { range: markerRange, newText: 'method($0)' },
                },
            ],
        },
        marker1: {
            completions: [
                {
                    label: 'method',
                    kind: Consts.CompletionItemKind.Method,
                    textEdit: { range: marker1Range, newText: 'method($0)' },
                },
            ],
        },
        marker2: {
            completions: [
                {
                    label: 'method',
                    kind: Consts.CompletionItemKind.Method,
                    textEdit: { range: marker2Range, newText: 'method' },
                },
            ],
        },
        marker3: {
            completions: [
                {
                    label: 'method',
                    kind: Consts.CompletionItemKind.Function,
                    textEdit: { range: marker3Range, newText: 'method($0)' },
                },
            ],
        },
        marker4: {
            completions: [
                {
                    label: 'method',
                    kind: Consts.CompletionItemKind.Function,
                    textEdit: { range: marker4Range, newText: 'method($0)' },
                },
            ],
        },
        marker5: {
            completions: [
                {
                    label: 'method',
                    kind: Consts.CompletionItemKind.Function,
                    textEdit: { range: marker5Range, newText: 'method' },
                },
            ],
        },
    });
}
