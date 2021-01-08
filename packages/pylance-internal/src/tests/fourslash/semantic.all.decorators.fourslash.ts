/// <reference path="fourslash.ts" />

// @filename: package/decorators.py
//// def my_decorator_func(fn):
////     return 10
////
//// class MyDecoratorClass:
////     def __init__(self, function):
////         self.function = function
////
////     def __call__(self, *args, **kwargs):
////         self.function(*args, **kwargs)
////
//// class MyClassWithDecoratorMethod:
////     def decorator_func1(self):
////         pass
////
////     def decorator_func2(self, p1, p2, p3, p4):
////         pass

// @filename: sem1.py
//// [|/*sem1*/|]
//// import [|package|].[|decorators|]
//// from [|package|].[|decorators|] import [|MyDecoratorClass|] as [|MDC|], [|my_decorator_func|] as [|mdf|]
////
//// @[|package|].[|decorators|].[|MyDecoratorClass|]
//// def [|my_func1|]():
////     pass
////
//// @[|MDC|]
//// def [|my_func2|]():
//// 	pass
////
//// @[|package|].[|decorators|].[|my_decorator_func|]
//// def [|my_func3|]():
////     return 15
////
//// @[|mdf|]
//// def [|my_func4|]():
////     return 15

// @filename: sem2.py
//// [|/*sem2*/|]
//// import [|package|].[|decorators|]
////
//// [|instance|] = [|package|].[|decorators|].[|MyClassWithDecoratorMethod|]()
////
//// @[|instance|].[|decorator_func1|]
//// def [|my_func5|]():
////     pass
////
//// [|var1|] = 0
//// [|CONST1|] = 0
////
//// def [|get_decorator_arg|]():
////     return 0
////
//// @[|instance|].[|decorator_func2|]([|var1|], [|CONST1|], [|int|]('1'), [|get_decorator_arg|]())
//// def [|my_func5|]():
////     pass

helper.verifySemanticTokens([
    {
        fileOrStartMarker: 'sem1',
        tokens: [
            { type: 'module' },
            { type: 'module' },
            { type: 'module' },
            { type: 'module' },
            { type: 'class' },
            { type: 'class' },
            { type: 'function' },
            { type: 'function' },
            { type: 'module', modifiers: ['decorator'] },
            { type: 'module', modifiers: ['decorator'] },
            { type: 'class', modifiers: ['decorator'] },
            { type: 'function', modifiers: ['declaration'] },
            { type: 'class', modifiers: ['decorator'] },
            { type: 'function', modifiers: ['declaration'] },
            { type: 'module', modifiers: ['decorator'] },
            { type: 'module', modifiers: ['decorator'] },
            { type: 'function', modifiers: ['decorator'] },
            { type: 'function', modifiers: ['declaration'] },
            { type: 'function', modifiers: ['decorator'] },
            { type: 'function', modifiers: ['declaration'] },
        ],
    },
    {
        fileOrStartMarker: 'sem2',
        tokens: [
            { type: 'module' },
            { type: 'module' },
            { type: 'variable', modifiers: ['declaration'] },
            { type: 'module' },
            { type: 'module' },
            { type: 'class' },
            { type: 'variable', modifiers: ['decorator'] },
            { type: 'method', modifiers: ['decorator'] },
            { type: 'function', modifiers: ['declaration'] },
            { type: 'variable', modifiers: ['declaration'] },
            { type: 'variable', modifiers: ['readonly', 'declaration'] },
            { type: 'function', modifiers: ['declaration'] },
            { type: 'variable', modifiers: ['decorator'] },
            { type: 'method', modifiers: ['decorator'] },
            { type: 'variable' },
            { type: 'variable', modifiers: ['readonly'] },
            { type: 'class', modifiers: ['builtin'] },
            { type: 'function' },
            { type: 'function', modifiers: ['declaration'] },
        ],
    },
]);
