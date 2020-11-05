/// <reference path="fourslash.ts" />

enum CannotExtractReason {
    None = 0,
    InvalidTargetSelected = 'Invalid Target Selected',
    InvalidExpressionSelected = 'Invalid Expression Selected',
    InvalidExpressionAndStatementSelected = 'Invalid Expression and Statement Selected',
    ContainsYieldExpression = 'Cannot extract yield',
    ContainsContinueWithoutLoop = 'Cannot extract continue without enclosing while/for loop',
    ContainsBreakWithoutLoop = 'Cannot extract break without enclosing while/for loop',
    ContainsReturnExpression = 'Cannot extract return',
    ContainsMultipleReturns = 'Cannot extract multiple returns',
    ReturnShouldBeLastStatement = 'Return should be last statement',
}

// @filename: TestVarsFromParamsAndUseAfterSelectionAndBeforeComment.py
////def f(c:int):
////    a = [1,2]
////    [|/*marker*/b = 2
////    a[0]= 3
////    ABC = a[0] + b + c + a + 1 + 42|] #comment
////    XYX = 100
////    return ABC
//@ts-ignore
await helper.verifyExtractMethod('marker', {
    ['file:///TestVarsFromParamsAndUseAfterSelectionAndBeforeComment.py']: [
        `ABC = new_func(c, a)`,
        `\n
def new_func( c, a ):
    b = 2
    a[0]= 3
    ABC = a[0] + b + c + a + 1 + 42
    return ABC`,
    ],
});

// @filename: TestSimpleVarUsedBeforeSelection.py
////def f():
////    a = 1
////    [|/*marker5*/return a + 3|]
// @ts-ignore
await helper.verifyExtractMethod('marker5', {
    ['file:///TestSimpleVarUsedBeforeSelection.py']: [
        `return new_func(a)`,
        `\n
def new_func( a ):
    return a + 3`,
    ],
});

// @filename: TestClassMethodDecorator.py
////class MyClass:
////
////    @classmethod
////    def classmethod_foo(cls):
////        b = [|/*marker2*/1 + 2|]
////        pass
// @ts-ignore
await helper.verifyExtractMethod('marker2', {
    ['file:///TestClassMethodDecorator.py']: [
        `cls.new_method()`,
        `\n
    @classmethod
    def new_method( cls ):
        return 1 + 2`,
    ],
});

// @filename: TestClassWithNormalFunc.py
////class MyClass:
////    def method(self):
////        a = [|/*marker3*/1 + 2|]
////        pass
// @ts-ignore
await helper.verifyExtractMethod('marker3', {
    ['file:///TestClassWithNormalFunc.py']: [
        `self.new_method()`,
        `\n
    def new_method( self ):
        return 1 + 2`,
    ],
});

// @filename: TestStaticMethodDecorator.py
////class MyClass:
////    @staticmethod
////    def staticmethod_foo():
////        c = [|/*marker4*/1 + 2|]
////        return 'static method called'
// @ts-ignore
await helper.verifyExtractMethod('marker4', {
    ['file:///TestStaticMethodDecorator.py']: [
        `MyClass.new_method()`,
        `\n
    @staticmethod
    def new_method():
        return 1 + 2`,
    ],
});

// @filename: TestExtractStatementAndReturn.py
////def f(c:int):
////    a = [1,2]
////    b = 2
////    a[0]= 3
////    ABC = a[0] + b + c + a + 1 + 42 #comment
////    [|/*marker6*/XYX = 100
////    return ABC|]
// @ts-ignore
await helper.verifyExtractMethod('marker6', {
    ['file:///TestExtractStatementAndReturn.py']: [
        `return new_func(ABC)`,
        `\n
def new_func( ABC ):
    XYX = 100
    return ABC`,
    ],
});

// @filename: TestContinueThrows.py
////def f():
////    n = 10
////    i = 0
////    while i < n:
////        if ( i == 0):
////            [|/*marker7*/continue i|]
////        i = i +1
// @ts-ignore
await expect(
    helper.verifyExtractMethod('marker7', {
        ['file:///TestContinueThrows.py']: [],
    })
).rejects.toThrowError(CannotExtractReason.ContainsContinueWithoutLoop);

// @filename: TestEnclosedWithContinue.py
////def f():
////    n = 10
////    i = 0
////    [|/*marker20*/while i < n:
////        if ( i == 0):
////            continue i
////        i = i +1|]
// @ts-ignore
await helper.verifyExtractMethod('marker20', {
    ['file:///TestEnclosedWithContinue.py']: [
        `new_func(n, i)`,
        `\n
def new_func( n, i ):
    while i < n:
        if ( i == 0):
            continue i
        i = i +1`,
    ],
});

// @filename: PartialIfStatementShouldThrow.py
////def f():
////    n = 10
////    i = 0
////    while i < n:
////        [|/*marker8*/if ( i == 0):|]
////            i = i +1
////        j = 2
// @ts-ignore
await expect(
    helper.verifyExtractMethod('marker8', {
        ['file:///PartialIfStatementShouldThrow.py']: [],
    })
).rejects.toThrowError(CannotExtractReason.InvalidTargetSelected);

// @filename: PartialWhileStatementShouldThrow.py
////def g():
////    n = 10
////    i = 0
////    [|/*marker9*/while i < n:|]
////        if ( i == 0):
////            i = i +1
////        j = 2
// @ts-ignore
await expect(
    helper.verifyExtractMethod('marker9', {
        ['file:///PartialWhileStatementShouldThrow.py']: [],
    })
).rejects.toThrowError(CannotExtractReason.InvalidTargetSelected);

// @filename: PartialWhileAndIFShouldFail.py
////def h():
////    n = 10
////    i = 0
////    [|/*marker10*/while i < n:
////        if ( i == 0):|]
////            i = i +1
////        j = 2
// @ts-ignore
await expect(
    helper.verifyExtractMethod('marker10', {
        ['file:///PartialWhileAndIFShouldFail.py']: [],
    })
).rejects.toThrowError(CannotExtractReason.InvalidTargetSelected);

// @filename: WhileStatementShouldPass.py
////def i():
////    n = 10
////    i = 0
////    [|/*marker11*/while i < n:
////        if ( i == 0):
////            i = i +1
////        j = 2|]
////k = 1
// @ts-ignore
await helper.verifyExtractMethod('marker11', {
    ['file:///WhileStatementShouldPass.py']: [
        `new_func(n, i)`,
        `\n
def new_func( n, i ):
    while i < n:
        if ( i == 0):
            i = i +1
        j = 2`,
    ],
});

// @filename: TestDefinitions.py
////def f():
////    def g():
////        return 42
////    def h():
////        return 23
////
////    [|/*marker12*/x = g()
////    z = h()|]
// @ts-ignore
await helper.verifyExtractMethod('marker12', {
    ['file:///TestDefinitions.py']: [
        `new_func(g, h)`,
        `\n
def new_func( g, h ):
    x = g()
    z = h()`,
    ],
});

// @filename: TestLeadingCommentGlobal.py
////# foo
////[|/*marker13*/x = 41|]
// @ts-ignore
await helper.verifyExtractMethod('marker13', {
    ['file:///TestLeadingCommentGlobal.py']: [
        `\n
def new_func():
    x = 41\n\n`,
        `new_func()`,
    ],
});

// @filename: AssignInIfStatementReadAfter.py
////class C:
////    def fob(self):
////        if False: # fob
////            [|/*marker14*/oar = player = Player()|]
////        else:
////            player.update()
// @ts-ignore
await helper.verifyExtractMethod('marker14', {
    ['file:///AssignInIfStatementReadAfter.py']: [
        `self.new_method()`,
        `\n
    def new_method( self ):
        oar = player = Player()`,
    ],
});

// @filename: TestExtractWithLambdaPresent.py
////def f():
////    [|/*marker15*/pass|]
////
////def x():
////    abc = lambda x: 42
// @ts-ignore
await helper.verifyExtractMethod('marker15', {
    ['file:///TestExtractWithLambdaPresent.py']: [
        `new_func()`,
        `\n
def new_func():
    pass`,
    ],
});

// @filename: TestExtractLambda.py
////def f():
////    abc = [|/*marker16*/lambda x: 42|]
// @ts-ignore
await helper.verifyExtractMethod('marker16', {
    ['file:///TestExtractLambda.py']: [
        `new_func()`,
        `\n
def new_func():
    return lambda x: 42`,
    ],
});

// @filename: TestStatementThenPartialIfShouldThrow.py
////def f():
////    [|/*marker17*/a =  1 + 2
////    if( a == 1):|]
////        a = 3
// @ts-ignore
await expect(
    helper.verifyExtractMethod('marker17', {
        ['file:///TestStatementThenPartialIfShouldThrow.py']: [],
    })
).rejects.toThrowError(CannotExtractReason.InvalidTargetSelected);

// @filename: TestReAssignmentAfterSelection.py
////def f():
////    [|/*marker19*/x = 42 |]
////    for x, y in []:
////        print x, y
// @ts-ignore
await helper.verifyExtractMethod('marker19', {
    ['file:///TestReAssignmentAfterSelection.py']: [
        `new_func()`,
        `\n
def new_func():
    x = 42`,
    ],
});

// @filename: TestReadBeforeReAssignment.py
////def f():
////    [|/*marker27*/x = 42 |]
////    b = x
////    for x, y in []:
////        print x, y
// @ts-ignore
await helper.verifyExtractMethod('marker27', {
    ['file:///TestReadBeforeReAssignment.py']: [
        `x = new_func()`,
        `\n
def new_func():
    x = 42
    return x`,
    ],
});

// @filename: TestUniqueFuncName.py
////def f():
////    [|/*marker21*/x = 41|]
////    pass
////def new_func()
////    pass
// @ts-ignore
await helper.verifyExtractMethod('marker21', {
    ['file:///TestUniqueFuncName.py']: [
        `new_func1()`,
        `\n
def new_func1():
    x = 41`,
    ],
});

// @filename: MultipleReturnsShouldThrow.py
////def f():
////    if(i == 1):
////        return 1
////    [|/*marker23*/if(1 == 2):
////        return 2
////    return 3|]
// @ts-ignore
await expect(
    helper.verifyExtractMethod('marker23', {
        ['file:///MultipleReturnsShouldThrow.py']: [],
    })
).rejects.toThrowError(CannotExtractReason.ContainsMultipleReturns);

// @filename: ReturnNotLastStatementShouldThrow.py
////def f():
////    if(i == 1):
////        return 1
////    [|/*marker24*/if(1 == 2):
////        return 2|]
////    return 3
// @ts-ignore
await expect(
    helper.verifyExtractMethod('marker24', {
        ['file:///ReturnNotLastStatementShouldThrow.py']: [],
    })
).rejects.toThrowError(CannotExtractReason.ReturnShouldBeLastStatement);

// @filename: TestGlobalFuncInsertsAheadOfSelection.py
////[|/*marker25*/x = 41|]
// @ts-ignore
await helper.verifyExtractMethod('marker25', {
    ['file:///TestGlobalFuncInsertsAheadOfSelection.py']: [
        `\n
def new_func():
    x = 41\n\n`,
        `new_func()`,
    ],
});

// @filename: TestLeafNameNodeShouldThrow.py
////[|/*marker26*/print|]("hello")
// @ts-ignore
await expect(
    helper.verifyExtractMethod('marker26', {
        ['file:///TestOnlyFuncNameShouldThrow.py']: [],
    })
).rejects.toThrowError(CannotExtractReason.InvalidTargetSelected);

// @filename: TestDoNotExpandSelectionToCommentAtEOF.py
//// def f():
////     ABC = [|/*marker28*/1 + 42|] #comment
// @ts-ignore
await helper.verifyExtractMethod('marker28', {
    ['file:///TestDoNotExpandSelectionToCommentAtEOF.py']: [
        `new_func()`,
        `\n
def new_func():
    return 1 + 42`,
    ],
});

// @filename: TestMiddleExpression.py
//// def f():
////     ABC = [|/*marker29*/1 + 42|] + 3 #comment
// @ts-ignore
await helper.verifyExtractMethod('marker29', {
    ['file:///TestMiddleExpression.py']: [
        `new_func()`,
        `\n
def new_func():
    return 1 + 42`,
    ],
});

// @filename: TestShrinkOperatorLeadingExpression.py
//// def f():
////     ABC = 5 [|/*marker30*/+ 1 + 42|] + 3 #comment
// @ts-ignore
await helper.verifyExtractMethod('marker30', {
    ['file:///TestShrinkOperatorLeadingExpression.py']: [
        `new_func()`,
        `\n
def new_func():
    return 1 + 42`,
    ],
});

// @filename: TestShrinkOperatorEndingExpression.py
//// def f():
////     ABC = 5 + [|/*marker31*/1 + 42 +|] 3 #comment
// @ts-ignore
await helper.verifyExtractMethod('marker31', {
    ['file:///TestShrinkOperatorEndingExpression.py']: [
        `new_func()`,
        `\n
def new_func():
    return 1 + 42`,
    ],
});

// @filename: TestWhiteSpaceAroundExpression.py
//// def f():
////     ABC = [|/*marker32*/ 1 + 42 |] #comment
// @ts-ignore
await helper.verifyExtractMethod('marker32', {
    ['file:///TestWhiteSpaceAroundExpression.py']: [
        `new_func()`,
        `\n
def new_func():
    return 1 + 42`,
    ],
});

// @filename: TestExtractEndOfFunction.py
//// def f():
////     return [|/*marker33*/1 + 3|]
////
//// def g():
////     return 1
// @ts-ignore
await helper.verifyExtractMethod('marker33', {
    ['file:///TestExtractEndOfFunction.py']: [
        `new_func()`,
        `\n
def new_func():
    return 1 + 3`,
    ],
});

// @filename: TestExtractEndOfFunctionWithTailSpace.py
//// def f():
////     return [|/*marker34*/1 + 3 |]
// @ts-ignore
await helper.verifyExtractMethod('marker34', {
    ['file:///TestExtractEndOfFunctionWithTailSpace.py']: [
        `new_func()`,
        `\n
def new_func():
    return 1 + 3`,
    ],
});

// @filename: TestExtractEndOfFunctionWithLeadingSpace.py
//// def f():
////     return [|/*marker35*/ 1 + 3 |]
// @ts-ignore
await helper.verifyExtractMethod('marker35', {
    ['file:///TestExtractEndOfFunctionWithLeadingSpace.py']: [
        `new_func()`,
        `\n
def new_func():
    return 1 + 3`,
    ],
});
