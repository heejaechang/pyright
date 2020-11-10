/// <reference path="fourslash.ts" />

// @filename: test.py
//// def [|/*marker1*/|]
////
//// def d[|/*marker2*/|]
////
//// def d1[|/*marker3*/|]():
////     pass
////
//// async def [|/*marker4*/|]
////
//// async def a[|/*marker5*/|]
////
//// async def a1[|/*marker6*/|]():
////     pass
////
//// def method(p[|/*marker7*/|]):
////     pass
//// def method(p:[|/*marker8*/|]):
////     pass
////
//// def method(p, p2[|/*marker9*/|]):
////     pass
//// def method(p, p2:[|/*marker10*/|]):
////     pass

// @ts-ignore
await helper.verifyCompletion('exact', 'markdown', {
    marker1: { completions: [] },
    marker2: { completions: [] },
    marker3: { completions: [] },
    marker4: { completions: [] },
    marker5: { completions: [] },
    marker6: { completions: [] },
    marker7: { completions: [] },
    marker9: { completions: [] },
});

// @ts-ignore
await helper.verifyCompletion('included', 'markdown', {
    marker8: { completions: [{ label: 'str', kind: Consts.CompletionItemKind.Class }] },
    marker10: { completions: [{ label: 'str', kind: Consts.CompletionItemKind.Class }] },
});
