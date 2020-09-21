/// <reference path="fourslash.ts" />

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
            references: [], // Document highlighting for string literals is disabled.
        },
    });
}
