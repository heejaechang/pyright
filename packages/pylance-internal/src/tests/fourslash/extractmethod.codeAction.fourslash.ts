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
    ContainsPartialIfElseStatement = 'Cannot extract partial if/else statement',
    PartialCommentSelected = 'Cannot extract partial comment',
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
await helper.verifyExtractMethod('marker', [
    `ABC = new_func(c, a)`,
    `\n
def new_func(c, a):
    b = 2
    a[0]= 3
    ABC = a[0] + b + c + a + 1 + 42 #comment
    return ABC`,
]);

// @filename: TestSimpleVarUsedBeforeSelection.py
////def f():
////    a = 1
////    [|/*marker5*/return a + 3|]
// @ts-ignore
await helper.verifyExtractMethod('marker5', [
    `return new_func(a)`,
    `\n
def new_func(a):
    return a + 3`,
]);

// @filename: TestClassMethodDecorator.py
////class MyClass:
////
////    @classmethod
////    def classmethod_foo(cls):
////        b = [|/*marker2*/1 + 2|]
////        pass
// @ts-ignore
await helper.verifyExtractMethod('marker2', [
    `cls.new_method()`,
    `\n
    @classmethod
    def new_method(cls):
        return 1 + 2`,
]);

// @filename: TestClassWithNormalFunc.py
////class MyClass:
////    def method(self):
////        a = [|/*marker3*/1 + 2|]
////        pass
// @ts-ignore
await helper.verifyExtractMethod('marker3', [
    `self.new_method()`,
    `\n
    def new_method(self):
        return 1 + 2`,
]);

// @filename: TestStaticMethodDecorator.py
////class MyClass:
////    @staticmethod
////    def staticmethod_foo():
////        c = [|/*marker4*/1 + 2|]
////        return 'static method called'
// @ts-ignore
await helper.verifyExtractMethod('marker4', [
    `MyClass.new_method()`,
    `\n
    @staticmethod
    def new_method():
        return 1 + 2`,
]);

// @filename: TestExtractStatementAndReturn.py
////def f(c:int):
////    a = [1,2]
////    b = 2
////    a[0]= 3
////    ABC = a[0] + b + c + a + 1 + 42 #comment
////    [|/*marker6*/XYX = 100
////    return ABC|]
// @ts-ignore
await helper.verifyExtractMethod('marker6', [
    `return new_func(ABC)`,
    `\n
def new_func(ABC):
    XYX = 100
    return ABC`,
]);

// @filename: TestContinueThrows.py
////def f():
////    n = 10
////    i = 0
////    while i < n:
////        if ( i == 0):
////            [|/*marker7*/continue i|]
////        i = i +1
// @ts-ignore
await expect(helper.verifyExtractMethod('marker7', [])).rejects.toThrowError(
    CannotExtractReason.ContainsContinueWithoutLoop
);

// @filename: PartialIfStatementShouldThrow.py
////def f():
////    n = 10
////    i = 0
////    while i < n:
////        [|/*marker8*/if ( i == 0):|]
////            i = i +1
////        j = 2
// @ts-ignore
await expect(helper.verifyExtractMethod('marker8', [])).rejects.toThrowError(CannotExtractReason.InvalidTargetSelected);

// @filename: PartialWhileStatementShouldThrow.py
////def g():
////    n = 10
////    i = 0
////    [|/*marker9*/while i < n:|]
////        if ( i == 0):
////            i = i +1
////        j = 2
// @ts-ignore
await expect(helper.verifyExtractMethod('marker9', [])).rejects.toThrowError(CannotExtractReason.InvalidTargetSelected);

// @filename: PartialWhileAndIFShouldFail.py
////def h():
////    n = 10
////    i = 0
////    [|/*marker10*/while i < n:
////        if ( i == 0):|]
////            i = i +1
////        j = 2
// @ts-ignore
await expect(helper.verifyExtractMethod('marker10', [])).rejects.toThrowError(
    CannotExtractReason.InvalidTargetSelected
);

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
await helper.verifyExtractMethod('marker11', [
    `new_func(n, i)`,
    `\n
def new_func(n, i):
    while i < n:
        if ( i == 0):
            i = i +1
        j = 2`,
]);

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
await helper.verifyExtractMethod('marker12', [
    `new_func(g, h)`,
    `\n
def new_func(g, h):
    x = g()
    z = h()`,
]);

// @filename: TestLeadingCommentGlobal.py
////# foo
////[|/*marker13*/x = 41|]
// @ts-ignore
await helper.verifyExtractMethod('marker13', [
    `def new_func():
    x = 41\n\n`,
    `new_func()`,
]);

// @filename: AssignInIfStatementReadAfter.py
////class C:
////    def fob(self):
////        if False: # fob
////            [|/*marker14*/oar = player = Player()|]
////        else:
////            player.update()
// @ts-ignore
await helper.verifyExtractMethod('marker14', [
    `self.new_method()`,
    `\n
    def new_method(self):
        oar = player = Player()`,
]);

// @filename: TestExtractWithLambdaPresent.py
////def f():
////    [|/*marker15*/pass|]
////
////def x():
////    abc = lambda x: 42
// @ts-ignore
await helper.verifyExtractMethod('marker15', [
    `new_func()`,
    `\n
def new_func():
    pass`,
]);

// @filename: TestExtractLambda.py
////def f():
////    abc = [|/*marker16*/lambda x: 42|]
// @ts-ignore
await helper.verifyExtractMethod('marker16', [
    `new_func()`,
    `\n
def new_func():
    return lambda x: 42`,
]);

// @filename: TestStatementThenPartialIfShouldThrow.py
////def f():
////    [|/*marker17*/a =  1 + 2
////    if( a == 1):|]
////        a = 3
// @ts-ignore
await expect(helper.verifyExtractMethod('marker17', [])).rejects.toThrowError(
    CannotExtractReason.InvalidTargetSelected
);

// @filename: TestReAssignmentAfterSelection.py
////def f():
////    [|/*marker19*/x = 42 |]
////    for x, y in []:
////        print x, y
// @ts-ignore
await helper.verifyExtractMethod('marker19', [
    `new_func()`,
    `\n
def new_func():
    x = 42`,
]);

// @filename: TestEnclosedWithContinue.py
////def f():
////    n = 10
////    i = 0
////    [|/*marker20*/while i < n:
////        if ( i == 0):
////            continue
////        i = i +1|]
// @ts-ignore
await helper.verifyExtractMethod('marker20', [
    `new_func(n, i)`,
    `\n
def new_func(n, i):
    while i < n:
        if ( i == 0):
            continue
        i = i +1`,
]);

// @filename: TestReadBeforeReAssignment.py
////def f():
////    [|/*marker27*/x = 42 |]
////    b = x
////    for x, y in []:
////        print x, y
// @ts-ignore
await helper.verifyExtractMethod('marker27', [
    `x = new_func()`,
    `\n
def new_func():
    x = 42
    return x`,
]);

// @filename: TestUniqueFuncName.py
////def f():
////    [|/*marker21*/x = 41|]
////    pass
////def new_func()
////    pass
// @ts-ignore
await helper.verifyExtractMethod('marker21', [
    `new_func1()`,
    `\n
def new_func1():
    x = 41`,
]);

// @filename: MultipleReturnsShouldThrow.py
////def f():
////    if(i == 1):
////        return 1
////    [|/*marker23*/if(1 == 2):
////        return 2
////    return 3|]
// @ts-ignore
await expect(helper.verifyExtractMethod('marker23', [])).rejects.toThrowError(
    CannotExtractReason.ContainsMultipleReturns
);

// @filename: ReturnNotLastStatementShouldThrow.py
////def f():
////    if(i == 1):
////        return 1
////    [|/*marker24*/if(1 == 2):
////        return 2|]
////    return 3
// @ts-ignore
await expect(helper.verifyExtractMethod('marker24', [])).rejects.toThrowError(
    CannotExtractReason.ReturnShouldBeLastStatement
);

// @filename: TestGlobalFuncInsertsAheadOfSelection.py
////[|/*marker25*/x = 41|]
// @ts-ignore
await helper.verifyExtractMethod('marker25', [
    `def new_func():
    x = 41\n\n`,
    `new_func()`,
]);

// @filename: TestLeafNameNodeShouldThrow.py
////[|/*marker26*/print|]("hello")
// @ts-ignore
await expect(helper.verifyExtractMethod('marker26', [])).rejects.toThrowError(
    CannotExtractReason.InvalidTargetSelected
);

// @filename: TestDoNotExpandSelectionToCommentAtEOF.py
//// def f():
////     ABC = [|/*marker28*/1 + 42|] #comment
// @ts-ignore
await helper.verifyExtractMethod('marker28', [
    `new_func()`,
    `\n
def new_func():
    return 1 + 42`,
]);

// @filename: TestMiddleExpression.py
//// def f():
////     ABC = [|/*marker29*/1 + 42|] + 3 #comment
// @ts-ignore
await helper.verifyExtractMethod('marker29', [
    `new_func()`,
    `\n
def new_func():
    return 1 + 42`,
]);

// @filename: TestShrinkOperatorLeadingExpression.py
//// def f():
////     ABC = 5 [|/*marker30*/+ 1 + 42|] + 3 #comment
// @ts-ignore
await helper.verifyExtractMethod('marker30', [
    `new_func()`,
    `\n
def new_func():
    return 1 + 42`,
]);

// @filename: TestShrinkOperatorEndingExpression.py
//// def f():
////     ABC = 5 + [|/*marker31*/1 + 42 +|] 3 #comment
// @ts-ignore
await helper.verifyExtractMethod('marker31', [
    `new_func()`,
    `\n
def new_func():
    return 1 + 42 + 3`,
]);

// @filename: TestWhiteSpaceAroundExpression.py
//// def f():
////     ABC = [|/*marker32*/ 1 + 42 |] #comment
// @ts-ignore
await helper.verifyExtractMethod('marker32', [
    `new_func()`,
    `\n
def new_func():
    return 1 + 42`,
]);

// @filename: TestExtractEndOfFunction.py
//// def f():
////     return [|/*marker33*/1 + 3|]
////
//// def g():
////     return 1
// @ts-ignore
await helper.verifyExtractMethod('marker33', [
    `new_func()`,
    `\n
def new_func():
    return 1 + 3`,
]);

// @filename: TestExtractEndOfFunctionWithTailSpace.py
//// def f():
////     return [|/*marker34*/1 + 3 |]
// @ts-ignore
await helper.verifyExtractMethod('marker34', [
    `new_func()`,
    `\n
def new_func():
    return 1 + 3`,
]);

// @filename: TestExtractEndOfFunctionWithLeadingSpace.py
//// def f():
////     return [|/*marker35*/ 1 + 3 |]
// @ts-ignore
await helper.verifyExtractMethod('marker35', [
    `new_func()`,
    `\n
def new_func():
    return 1 + 3`,
]);

// @filename: TestCompleteIfElse.py
////def function(name: str):
////    [|/*marker36*/if name == 'john':
////        print('hello john')
////    elif name == 'mark':
////        print('hello mark')|]
// @ts-ignore
await helper.verifyExtractMethod('marker36', [
    `new_func(name)`,
    `\n
def new_func(name):
    if name == 'john':
        print('hello john')
    elif name == 'mark':
        print('hello mark')`,
]);

// @filename: TestPartialElseShouldThrow.py
////def function(name: str):
////    if name == 'john':
////        print('hello john')
////    [|/*marker37*/elif name == 'mark':
////        print('hello mark')|]
// @ts-ignore
await expect(helper.verifyExtractMethod('marker37', [])).rejects.toThrowError(
    CannotExtractReason.ContainsPartialIfElseStatement
);

// @filename: TestExtractArgumentShouldHaveReturn.py
//// from werkzeug import url_quote
////
//// def function(anchor):
////     hello = ''
////     if anchor is not None:
////         hello += url_quote([|/*marker38*/anchor|])
////     return hello
// @ts-ignore
await expect(helper.verifyExtractMethod('marker38', [])).rejects.toThrowError(
    CannotExtractReason.InvalidTargetSelected
);

// @filename: TestExtractDoubleIndentedCode.py
//// def function(url_adapter, old_scheme):
////     try:
////         [|/*marker39*/try:
////             rv = url_adapter.build()
////         finally:
////             if old_scheme is not None:
////                 url_adapter.url_scheme = old_scheme|]
////     except ValueError as error:
////         pass
// @ts-ignore
await helper.verifyExtractMethod('marker39', [
    `new_func(url_adapter, old_scheme)`,
    `\n
def new_func(url_adapter, old_scheme):
    try:
        rv = url_adapter.build()
    finally:
        if old_scheme is not None:
            url_adapter.url_scheme = old_scheme`,
]);

// @filename: TestExtractDoubleIndentedCodeWithMultilineComment.py
////def function(url_adapter, old_scheme):
////    try:
////        [|/*marker40*/try:
////            rv = url_adapter.build()
////            str = """Multiline
//// string"""
////        finally:
////            if old_scheme is not None:
////                url_adapter.url_scheme = old_scheme|]
////    except ValueError as error:
////        pass
// @ts-ignore
await helper.verifyExtractMethod('marker40', [
    `new_func(url_adapter, old_scheme)`,
    `\n
def new_func(url_adapter, old_scheme):
    try:
        rv = url_adapter.build()
        str = """Multiline
 string"""
    finally:
        if old_scheme is not None:
            url_adapter.url_scheme = old_scheme`,
]);

// @filename: TestInvalidExpressionWithStatementShouldThrow.py
////def function():
////    x =[|/*marker41*/ 1
////    y = 2|]
// @ts-ignore
await expect(helper.verifyExtractMethod('marker41', [])).rejects.toThrowError(
    CannotExtractReason.InvalidExpressionAndStatementSelected
);

// @filename: TestMultilineStatement.py
////total = [|/*marker42*/1 + \
////    2 + \
////    3|]
// @ts-ignore
await helper.verifyExtractMethod('marker42', [
    `def new_func():
    return 1 + \\
    2 + \\
    3\n\n`,
    `new_func()`,
]);

// @filename: TestMultilineComment.py
////[|/*marker43*/""" This is a comment
////written in
////more than just one line """
////
////print("Hello, World!")|]
// @ts-ignore
await helper.verifyExtractMethod('marker43', [
    `def new_func():
    """ This is a comment
written in
more than just one line """
    print("Hello, World!")\n\n`,
    `new_func()`,
]);

// @filename: TestReadBeforeWriteAfterSelection.py
////[|/*marker44*/x = 1|]
////x = x
// @ts-ignore
await helper.verifyExtractMethod('marker44', [
    `def new_func():
    x = 1
    return x\n\n`,
    `x = new_func()`,
]);

// @filename: TestDuplicateSelfParams.py
////import os.path
////
////class MyClass:
////    import_name: str
////
////    def method1(self):
////        [|/*marker45*/var1 = os.path.dirname(self.import_name)
////        var2 = os.path.basename(self.import_name)|]
////        print(var1)
////        print(var2)
// @ts-ignore
await helper.verifyExtractMethod('marker45', [
    `var1, var2 = self.new_method()`,
    `\n
    def new_method(self):
        var1 = os.path.dirname(self.import_name)
        var2 = os.path.basename(self.import_name)
        return var1,var2`,
]);

// @filename: TestExtractMultiArgumentShouldFail.py
////class MyBase:
////    def __init__(self, firstname: str, lastname: str):
////        pass
////
////class MyDerived(MyBase):
////    def __init__(self):
////        super().__init__(
////            [|/*marker46*/firstname='hugues',
////            lastname='valois'|]
////        )
////        print('end of init')
// @ts-ignore
await expect(helper.verifyExtractMethod('marker46', [])).rejects.toThrowError(
    CannotExtractReason.InvalidTargetSelected
);

// @filename: TestExtractSingleArgumentShouldFail.py
//// from werkzeug import url_quote
////
//// def function(anchor):
////     hello = ''
////     if anchor is not None:
////         hello += url_quote([|/*marker47*/anchor|])
////     return hello
// @ts-ignore
await expect(helper.verifyExtractMethod('marker47', [])).rejects.toThrowError(
    CannotExtractReason.InvalidTargetSelected
);

// @filename: TestBlankLineEndOfSelectionFunctionScope.py
////def function(name: str):
////    [|/*marker48*/x = 1
////|]
////    y = 2
// @ts-ignore
await helper.verifyExtractMethod('marker48', [
    `new_func()`,
    `\n
def new_func():
    x = 1`,
]);

// @filename: TestBlankLineAheadOfSelectionGlobalScope.py
////
////x = 1
////
////[|/*marker49*/y = 2|]
// @ts-ignore
await helper.verifyExtractMethod('marker49', [`def new_func():\n    y = 2\n\n`, `new_func()`]);

// @filename: TestExtractComment.py
////def f(c:int):
////    [|/*marker50*/ABC = 1 + 42 #comment|]
////    XYX = 100
////    return ABC
//@ts-ignore
await helper.verifyExtractMethod('marker50', [
    `ABC = new_func()`,
    `\n
def new_func():
    ABC = 1 + 42 #comment
    return ABC`,
]);

// @filename: TestExtendingEndPointToSpanOperator.py
////def function(add_etags, filename):
////    if [|/*marker51*/add_etags and filename|] is not None:
////        pass
// @ts-ignore
await helper.verifyExtractMethod('marker51', [
    `new_func(add_etags, filename)`,
    `\n
def new_func(add_etags, filename):
    return add_etags and filename is not None`,
]);

// @filename: TestTernarySelection.py
////def function(session):
////    flashes = [|/*marker52*/session.pop("_flashes") if "_flashes" in session else []|]
// @ts-ignore
await helper.verifyExtractMethod('marker52', [
    `new_func(session)`,
    `\n
def new_func(session):
    return session.pop("_flashes") if "_flashes" in session else []`,
]);

// @filename: TestExpandTernarySelectionEndpoint.py
////def function(session):
////    flashes = [|/*marker53*/session.pop("_flashes") if "_flashes"|] in session else []
// @ts-ignore
await helper.verifyExtractMethod('marker53', [
    `new_func(session)`,
    `\n
def new_func(session):
    return session.pop("_flashes") if "_flashes" in session else []`,
]);

// @filename: TestTernaryWithInvalidStartSelectionShouldFail.py
////def function(session):
////    flashes = session.pop("_flashes") if [|/*marker54*/"_flashes" in session else []|]
// @ts-ignore
await expect(helper.verifyExtractMethod('marker54', [])).rejects.toThrowError(
    CannotExtractReason.InvalidTargetSelected
);

// @filename: TestExtractCommentOnLastStatement.py
////def f(c:int):
////    ABC = 1
////    [|/*marker55*/return ABC #comment|]
//@ts-ignore
await helper.verifyExtractMethod('marker55', [
    `return new_func(ABC)`,
    `\n
def new_func(ABC):
    return ABC #comment`,
]);

// @filename: TestExtractInlinedForStatement.py
////def f(weights):
////    names = [[|/*marker56*/w.name|] for w in weights]
//@ts-ignore
await helper.verifyExtractMethod('marker56', [
    `new_func(w)`,
    `\n
def new_func(w):
    return w.name`,
]);

// @filename: TestExtractBinaryOperationInsideParens.py
////x = ([|/*marker57*/1 + 2|])
//@ts-ignore
await helper.verifyExtractMethod('marker57', [
    `def new_func():
    return 1 + 2\n\n`,
    `new_func()`,
]);

// @filename: TestExtractCompleteForLoop.py
////fruits = ["apple", "banana", "cherry"]
////[|/*marker58*/for x in fruits:
////    print(x)|]
//@ts-ignore
await helper.verifyExtractMethod('marker58', [
    `def new_func(fruits):
    for x in fruits:
        print(x)\n\n`,
    `new_func(fruits)`,
]);

// @filename: TestExtractImportShouldFail.py
////from __future__ import [|/*marker59*/print_function|]
// @ts-ignore
await expect(helper.verifyExtractMethod('marker59', [])).rejects.toThrowError(
    CannotExtractReason.InvalidTargetSelected
);

// @filename: TestExtractImportFromShouldFail.py
////from [|/*marker60*/__future__|] import print_function
// @ts-ignore
await expect(helper.verifyExtractMethod('marker60', [])).rejects.toThrowError(
    CannotExtractReason.InvalidTargetSelected
);

// @filename: TestExtractImportAsShouldFail.py
////import os as [|/*marker61*/osAlias|]
// @ts-ignore
await expect(helper.verifyExtractMethod('marker61', [])).rejects.toThrowError(
    CannotExtractReason.InvalidTargetSelected
);

// @filename: TestExtractImportOsShouldFail.py
////import [|/*marker62*/os|]
// @ts-ignore
await expect(helper.verifyExtractMethod('marker62', [])).rejects.toThrowError(
    CannotExtractReason.InvalidTargetSelected
);

// @filename: TestExtractImportRef.py
////import gc
////[|/*marker63*/gc.collect()|]
//@ts-ignore
await helper.verifyExtractMethod('marker63', [
    `def new_func():
    gc.collect()\n\n`,
    `new_func()`,
]);

// @filename: TestExtractParameterExpressionShouldFail.py
////def f([|/*marker64*/x=1|])
////    x = 2
//@ts-ignore
await expect(helper.verifyExtractMethod('marker64', [])).rejects.toThrowError(
    CannotExtractReason.InvalidExpressionSelected
);

// @filename: TestExtractNewLinePre.py
////import gc
////[|/*marker65*/
////
////gc.collect()|]
////x = 1
//@ts-ignore
await helper.verifyExtractMethod('marker65', [
    `def new_func():
    gc.collect()\n\n`,
    `new_func()`,
]);

// @filename: TestExtractNewLinePost.py
////import gc
////[|/*marker66*/gc.collect()
////|]
////x = 1
//@ts-ignore
await helper.verifyExtractMethod('marker66', [
    `def new_func():
    gc.collect()\n\n`,
    `new_func()`,
]);

// @filename: TestPartialForLoopGeneratorShouldFail.py
////list = []
////x = {print(i) [|/*marker67*/for i in list|]}
//@ts-ignore
await expect(helper.verifyExtractMethod('marker67', [])).rejects.toThrowError(
    CannotExtractReason.InvalidTargetSelected
);

// @filename: TestInsideForLoopGenerator.py
////list = []
////x = {[|/*marker68*/print(i)|] for i in list}
//@ts-ignore
await helper.verifyExtractMethod('marker68', [
    `def new_func(i):
    print(i)\n\n`,
    `new_func(i)`,
]);

// @filename: TestAwait.py
////async def hello():
////    [|/*marker69*/await print("")|]
////
//@ts-ignore
await helper.verifyExtractMethod('marker69', [
    `await new_func()`,
    `\n
async def new_func():
    return await print("")`,
]);

// @filename: TestCommentAbove.py
//// [|/*marker70*/# Comment
//// z = 1
//// print(z)|]
////
// @ts-ignore
await helper.verifyExtractMethod('marker70', [
    `def new_func():
    # Comment
    z = 1
    print(z)\n\n`,
    `new_func()`,
]);

// @filename: TestPartialCommentAboveShouldThrow.py
//// # Com[|/*marker71*/ment
//// z = 1
//// print(z)|]
////
// @ts-ignore
await expect(helper.verifyExtractMethod('marker71', [``, ``])).rejects.toThrowError(
    CannotExtractReason.InvalidExpressionAndStatementSelected
);

// @filename: TestMulitlineCommentAbove.py
//// [|/*marker72*/"""
//// multiline comment
//// """
//// z = 1
//// print(z)|]
////
// @ts-ignore
await helper.verifyExtractMethod('marker72', [
    `def new_func():
    """
multiline comment
"""
    z = 1
    print(z)\n\n`,
    `new_func()`,
]);

// @filename: TestPartialMulitlineCommentAboveShouldThrow.py
//// """
//// multiline [|/*marker73*/comment
//// """
//// z = 1
//// print(z)|]
////
// @ts-ignore
await expect(helper.verifyExtractMethod('marker73', [``, ``])).rejects.toThrowError(
    CannotExtractReason.PartialCommentSelected
);

// @filename: TestCommentBelow.py
//// [|/*marker74*/z = 1
//// print(z)
//// # Comment|]
// @ts-ignore
await helper.verifyExtractMethod('marker74', [
    `def new_func():
    z = 1
    print(z)
    # Comment\n\n`,
    `new_func()`,
]);
