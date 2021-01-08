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
////         [|self|].[|field|] = 1
////         pass
////     def [|not_really_self_param|]([|first|], [|self|]):
////         pass

helper.verifySemanticTokens([
    {
        fileOrStartMarker: 'sem1',
        tokens: [
            { type: 'class', modifiers: ['declaration'] },
            { type: 'method', modifiers: ['declaration'] },
            { type: 'selfParameter', modifiers: ['declaration'] },
            { type: 'parameter', modifiers: ['declaration'] },
            { type: 'variable', modifiers: ['declaration'] },
            { type: 'parameter' },
            { type: 'class', modifiers: ['decorator', 'builtin'] },
            { type: 'method', modifiers: ['static', 'declaration'] },
            { type: 'clsParameter', modifiers: ['declaration'] },
            { type: 'class', modifiers: ['decorator', 'builtin'] },
            { type: 'method', modifiers: ['async', 'static', 'declaration'] },
        ],
    },
    {
        fileOrStartMarker: 'sem2',
        tokens: [
            { type: 'class', modifiers: ['declaration'] },
            { type: 'class', modifiers: ['decorator', 'builtin'] },
            { type: 'property', modifiers: ['declaration'] },
            { type: 'selfParameter', modifiers: ['declaration'] },
            { type: 'property', modifiers: ['decorator'] },
            { type: 'property', modifiers: ['declaration'] },
            { type: 'selfParameter', modifiers: ['declaration'] },
            { type: 'parameter', modifiers: ['declaration'] },
        ],
    },
    {
        fileOrStartMarker: 'sem3',
        tokens: [
            { type: 'module' },
            { type: 'class' },
            { type: 'variable', modifiers: ['declaration'] },
            { type: 'class' },
            { type: 'variable' },
            { type: 'method' },
            { type: 'variable' },
        ],
    },
    {
        fileOrStartMarker: 'sem4',
        tokens: [
            { type: 'class', modifiers: ['declaration'] },
            { type: 'magicFunction', modifiers: ['declaration'] },
            { type: 'selfParameter', modifiers: ['declaration'] },
            { type: 'selfParameter', modifiers: [] },
            { type: 'property', modifiers: ['declaration'] },
            { type: 'method', modifiers: ['declaration'] },
            { type: 'parameter', modifiers: ['declaration'] },
            { type: 'parameter', modifiers: ['declaration'] },
        ],
    },
]);
