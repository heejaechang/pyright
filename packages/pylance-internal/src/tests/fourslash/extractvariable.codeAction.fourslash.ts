/// <reference path="fourslash.ts" />

enum ExtractVariableCannotExtractReason {
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
}

// @filename: testBasicExpression.py
////def f():
////    b = [|/*marker*/2 + 3|]
////    return b
// @ts-ignore
await helper.verifyExtractVariable('marker', [`new_var`, `new_var = 2 + 3\n    `]);

// @filename: testMiddleExpression.py
////def f():
////    b = [|/*marker2*/2 + 3|] + 1
////    return b
// @ts-ignore
await helper.verifyExtractVariable('marker2', [`new_var`, `new_var = 2 + 3\n    `]);

// @filename: testExpressionWithComment.py
////def f():
////    b = [|/*marker3*/2 + 3 + 1 #comment|]
////    return b
// @ts-ignore
await helper.verifyExtractVariable('marker3', [`new_var`, `new_var = 2 + 3 + 1 #comment\n    `]);

// @filename: testExpressionWithPartialComment.py
////def f():
////    b = [|/*marker4*/2 + 3 + 1 #com|]ment
////    return b

// @ts-ignore
await helper.verifyExtractVariable('marker4', [`new_var`, `new_var = 2 + 3 + 1 #comment\n    `]);

// @filename: testExpressionAndStatementShouldThrow.py
////def f():
////    b = [|/*marker5*/2 + 3 + 1 #comment
////    a = 1 |]
////    return b
// @ts-ignore
await expect(helper.verifyExtractVariable('marker5', [])).rejects.toThrowError(
    ExtractVariableCannotExtractReason.InvalidExpressionSelected
);

// @filename: testAssignmentShouldThrow.py
////def f():
////    [|/*marker6*/b = 2|] + 3 + 1 #comment
////    a = 1
////    return b
// @ts-ignore
await expect(helper.verifyExtractVariable('marker6', [])).rejects.toThrowError(
    ExtractVariableCannotExtractReason.InvalidExpressionSelected
);

// @filename: TestUniqueVariableNameInFunction.py
////def f():
////    new_var = 1
////    b = [|/*marker7*/2 + 3|]
////    return b
// @ts-ignore
await helper.verifyExtractVariable('marker7', [`new_var1`, `new_var1 = 2 + 3\n    `]);

// @filename: TestUniqueVariableNameInModule.py
////new_var = 1
////b = [|/*marker8*/2 + 3|]
// @ts-ignore
await helper.verifyExtractVariable('marker8', [`new_var1`, `new_var1 = 2 + 3\n`]);

// @filename: testAugmentedAssignmentShouldThrow.py
////def f():
////    [|/*marker9*/b|] += 1
////    return b
// @ts-ignore
await expect(helper.verifyExtractVariable('marker9', [])).rejects.toThrowError(
    ExtractVariableCannotExtractReason.InvalidExpressionSelected
);

// @filename: testMultiIndention.py
////class MyClass:
////    def function(self, name):
////        if name is not [|/*marker10*/None|]:
////            pass
// @ts-ignore
await helper.verifyExtractVariable('marker10', [`new_var`, `new_var = None\n        `]);

// @filename: testMultilineString.py
////def f():
////    str = [|/*marker11*/"""Multiline
//// string"""|]
// @ts-ignore
await helper.verifyExtractVariable('marker11', [`new_var`, `new_var = """Multiline\n string"""\n    `]);

// @filename: TestExtractParamShouldFail.py
////def function([|/*marker12*/session|]):
////    pass
// @ts-ignore
await expect(helper.verifyExtractVariable('marker12', [])).rejects.toThrowError(
    ExtractVariableCannotExtractReason.InvalidTargetSelected
);

// @filename: TestExtractModuleLevelCallSpacing.py
////import gc
////[|/*marker13*/gc.collect()|]
//@ts-ignore
await helper.verifyExtractVariable('marker13', [`new_var`, `new_var = gc.collect()\n`]);

// @filename: TestExtractParameterExpressionShouldFail.py
////def f([|/*marker14*/x=1|])
////    x = 2
//@ts-ignore
await expect(helper.verifyExtractVariable('marker14', [])).rejects.toThrowError(
    ExtractVariableCannotExtractReason.InvalidExpressionSelected
);

// @filename: TestExtractMultilineSpacingPost.py
////import gc
////[|/*marker15*/gc.collect()
////|]
////x = 1
//@ts-ignore
await helper.verifyExtractVariable('marker15', [`new_var`, `new_var = gc.collect()\n`]);

// @filename: TestExtractMultilineSpacingPre.py
////import gc
////[|/*marker16*/
////
////gc.collect()|]
////x = 1
//@ts-ignore
await helper.verifyExtractVariable('marker16', [`new_var`, `new_var = gc.collect()\n`]);
