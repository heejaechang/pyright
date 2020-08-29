/// <reference path="../../../pyright/server/src/tests/fourslash/fourslash.ts" />

// @filename: testLib1/__init__.py
// @library: true
//// class Test1:
////    def M(self, a: Test1):
////        pass

// @filename: test.py
//// from testLib1 import [|{| "kind":"write" |}Test1|]
////
//// a = [|{| "name":"marker", "kind":"read" |}Test1|]()
////
//// class C:
////    def M(self, b: [|{| "kind":"read" |}Test1|]):
////        pass

{
    const ranges = helper.getRanges();

    helper.verifyHighlightReferences({
        marker: {
            references: ranges.map((r) => {
                return { range: helper.convertPositionRange(r), kind: helper.getDocumentHighlightKind(r.marker) };
            }),
        },
    });
}
