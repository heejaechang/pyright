/// <reference path="../../../pyright/server/src/tests/fourslash/fourslash.ts" />

// @filename: test.py
//// a = [|{| "name":"marker", "kind":"text" |}'string literal'|]
////
//// class C:
////    def M(self, b = [|{| "kind":"text" |}'string literal'|]):
////        c = [|{| "kind":"text" |}'string literal'|]

{
    const ranges = helper.getRanges();

    helper.verifyHighlightReferences({
        marker: {
            references: ranges.map((r) => {
                return { range: helper.convertPositionRange(r) };
            }),
        },
    });
}
