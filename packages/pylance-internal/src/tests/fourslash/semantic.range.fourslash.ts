/// <reference path="fourslash.ts" />

// @filename: sem.py
//// def func1():
////     pass
//// [|/*start*/|]
//// class [|class1|]:
////     pass
//// def [|func2|]():
////     pass
//// class [|class2|]:
////     pass
//// [|/*end*/|]
//// def func3():
////     pass
//// class class3:
////     pass

helper.verifySemanticTokens([
    {
        fileOrStartMarker: 'start',
        endMarker: 'end',
        tokens: [
            { type: 'class', modifiers: ['declaration'] },
            { type: 'function', modifiers: ['declaration'] },
            { type: 'class', modifiers: ['declaration'] },
        ],
    },
]);
