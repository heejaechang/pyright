/// <reference path="fourslash.ts" />

// @filename: sem1.py
//// [|/*sem1*/|]
//// class [|MyClass1|]:
////     def [|method1|]([|self|], [|parameter|]):
////         [|variable|] = [|parameter|]
////
////     @[|staticmethod|]
////     def [|method2|]([|cls|]):
////         pass
////
////     @[|staticmethod|]
////     async def [|method3|]():
////         pass
////

// @filename: sem2.py
//// [|/*sem2*/|]
//// class [|MyClass2|]:
////     @[|property|]
////     def [|prop1|]([|self|]):
////         return 0
////
////     @[|prop1|].setter
////     def [|prop1|]([|self|], [|val|]):
////         pass

// @filename: sem3.py
//// [|/*sem3*/|]
//// from [|sem1|] import [|MyClass1|]
//// [|mc|] = [|MyClass1|]
//// [|mc|].[|method1|](0)
//// [|mc|].not_exist(0)

// @filename: sem4.py
//// [|/*sem4*/|]
//// class [|MyClass4|]:
////     def [|__init__|]([|self|]):
////         pass

helper.verifySemanticTokens([
    {
        fileOrStartMarker: 'sem1',
        tokens: [
            { type: 'class' },
            { type: 'function' },
            { type: 'selfParameter' },
            { type: 'parameter' },
            { type: 'variable' },
            { type: 'parameter' },
            { type: 'class' },
            { type: 'function', modifiers: ['static'] },
            { type: 'clsParameter' },
            { type: 'class' },
            { type: 'function', modifiers: ['async', 'static'] },
        ],
    },
    {
        fileOrStartMarker: 'sem2',
        tokens: [
            { type: 'class' },
            { type: 'class' },
            { type: 'property' },
            { type: 'selfParameter' },
            { type: 'property' },
            { type: 'property' },
            { type: 'selfParameter' },
            { type: 'parameter' },
        ],
    },
    {
        fileOrStartMarker: 'sem3',
        tokens: [
            { type: 'module' },
            { type: 'class' },
            { type: 'variable' },
            { type: 'class' },
            { type: 'variable' },
            { type: 'function' },
            { type: 'variable' },
        ],
    },
    {
        fileOrStartMarker: 'sem4',
        tokens: [{ type: 'class' }, { type: 'magicFunction' }, { type: 'selfParameter' }],
    },
]);
