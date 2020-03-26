/*
 * assignmentWalker.test.ts
 *
 * IntelliCode assignment walker tests.
 */

import 'jest-extended';

import { AssignmentWalker } from '../../../intelliCode/assignmentWalker';
import { StandardVariableType } from '../../../intelliCode/nodes';
import { DiagnosticSink } from '../../../pyright/server/src/common/diagnosticSink';
import { ParseOptions, Parser, ParseResults } from '../../../pyright/server/src/parser/parser';

function parseCode(code: string): ParseResults {
    const parser = new Parser();
    return parser.parseSourceFile(code, new ParseOptions(), new DiagnosticSink());
}

function walkCode(code: string): AssignmentWalker {
    const pr = parseCode(code);
    const aw = new AssignmentWalker();
    aw.walk(pr.parseTree);
    return aw;
}

test('IntelliCode assignment walker: numbers', () => {
    const code = `
i = 1
f = 2.1
`;
    const aw = walkCode(code);
    expect(aw.scopes).toBeArrayOfSize(1);
    expect(aw.scopes[0].assignments).toBeArrayOfSize(2);

    const assignments = aw.scopes[0].assignments;
    expect(assignments).toIncludeSameMembers([
        { key: 'i', value: StandardVariableType.Int, spanStart: 1 },
        { key: 'f', value: StandardVariableType.Float, spanStart: 7 }
    ]);
});

test('IntelliCode assignment walker: strings', () => {
    const code = `
s1 = 'str'
s2 = "str"
s3 = '''str'''
s4 = """str"""
s5 = f'str'
`;
    const aw = walkCode(code);
    expect(aw.scopes).toBeArrayOfSize(1);
    expect(aw.scopes[0].assignments).toBeArrayOfSize(5);

    const assignments = aw.scopes[0].assignments;
    expect(assignments).toIncludeSameMembers([
        { key: 's1', value: StandardVariableType.String, spanStart: 1 },
        { key: 's2', value: StandardVariableType.String, spanStart: 12 },
        { key: 's3', value: StandardVariableType.String, spanStart: 23 },
        { key: 's4', value: StandardVariableType.String, spanStart: 38 },
        { key: 's5', value: StandardVariableType.String, spanStart: 53 }
    ]);
});

test('IntelliCode assignment walker: variables', () => {
    const code = `
x = 1
y = x
z = a
`;
    const aw = walkCode(code);
    expect(aw.scopes).toBeArrayOfSize(1);
    expect(aw.scopes[0].assignments).toBeArrayOfSize(2);

    const assignments = aw.scopes[0].assignments;
    expect(assignments).toIncludeSameMembers([
        { key: 'x', value: StandardVariableType.Int, spanStart: 1 },
        { key: 'y', value: StandardVariableType.Int, spanStart: 7 }
    ]);
});

test('IntelliCode assignment walker: tuple', () => {
    const code = `
x = (1, 2)
y = ([1, 2], ['s', 'a'])
`;
    const aw = walkCode(code);
    expect(aw.scopes).toBeArrayOfSize(1);
    expect(aw.scopes[0].assignments).toBeArrayOfSize(2);

    const assignments = aw.scopes[0].assignments;
    expect(assignments).toIncludeSameMembers([
        { key: 'x', value: StandardVariableType.Tuple, spanStart: 1 },
        { key: 'y', value: StandardVariableType.Tuple, spanStart: 12 }
    ]);
});

test('IntelliCode assignment walker: dictionary', () => {
    const code = `
x = {'name': 'Bob', age: 20}
y = x
z = {k:k+':'+v for (k,v) in x.items()}
`;
    const aw = walkCode(code);
    expect(aw.scopes).toBeArrayOfSize(1);
    expect(aw.scopes[0].assignments).toBeArrayOfSize(3);

    const assignments = aw.scopes[0].assignments;
    expect(assignments).toIncludeSameMembers([
        { key: 'x', value: StandardVariableType.Dictionary, spanStart: 1 },
        { key: 'y', value: StandardVariableType.Dictionary, spanStart: 30 },
        { key: 'z', value: StandardVariableType.Dictionary, spanStart: 36 }
    ]);
});

test('IntelliCode assignment walker: set', () => {
    const code = `
x = {1, 2, 3}
y = x
`;
    const aw = walkCode(code);
    expect(aw.scopes).toBeArrayOfSize(1);
    expect(aw.scopes[0].assignments).toBeArrayOfSize(2);

    const assignments = aw.scopes[0].assignments;
    expect(assignments).toIncludeSameMembers([
        { key: 'x', value: StandardVariableType.Set, spanStart: 1 },
        { key: 'y', value: StandardVariableType.Set, spanStart: 15 }
    ]);
});

test('IntelliCode assignment walker: list', () => {
    const code = `
x = [1, 2, 3]
y = x
z = [ letter for letter in 'abcde' ]
`;
    const aw = walkCode(code);
    expect(aw.scopes).toBeArrayOfSize(1);
    expect(aw.scopes[0].assignments).toBeArrayOfSize(3);

    const assignments = aw.scopes[0].assignments;
    expect(assignments).toIncludeSameMembers([
        { key: 'x', value: StandardVariableType.List, spanStart: 1 },
        { key: 'y', value: StandardVariableType.List, spanStart: 15 },
        { key: 'z', value: StandardVariableType.List, spanStart: 21 }
    ]);
});

test('IntelliCode assignment walker: call', () => {
    const code = `
x = 'str'
y = x.count().bitlength()
z = 'a'.count()
`;
    const aw = walkCode(code);
    expect(aw.scopes).toBeArrayOfSize(1);
    expect(aw.scopes[0].assignments).toBeArrayOfSize(3);

    const assignments = aw.scopes[0].assignments;
    expect(assignments).toIncludeSameMembers([
        { key: 'x', value: StandardVariableType.String, spanStart: 1 },
        { key: 'y', value: 'str.count.bitlength', spanStart: 16 },
        { key: 'z', value: 'str.count', spanStart: 44 }
    ]);
});

test('IntelliCode assignment walker: scopes', () => {
    const code = `
v = 1

def func():
    a = 1
    return a

class A:
    b = 2
    def m1():
        c = 'c'
        return 0

class B:
    d = 4
    def m1():
        e = 5
        return 0
    def m6():
        f = 6
        return 0

z = 'x'
`;
    const aw = walkCode(code);
    expect(aw.scopes).toBeArrayOfSize(7);
    let scope = aw.scopes[0];
    expect(scope.assignments).toIncludeSameMembers([
        { key: 'v', value: StandardVariableType.Int, spanStart: 1 },
        { key: 'z', value: StandardVariableType.String, spanStart: 221 }
    ]);

    scope = aw.scopes[1];
    expect(scope.name).toEqual('func');
    expect(scope.parent!.name).toEqual('<module>');
    expect(scope.assignments).toIncludeSameMembers([{ key: 'a', value: StandardVariableType.Int, spanStart: 24 }]);

    scope = aw.scopes[2];
    expect(scope.name).toEqual('A');
    expect(scope.parent!.name).toEqual('<module>');
    expect(scope.assignments).toIncludeSameMembers([{ key: 'b', value: StandardVariableType.Int, spanStart: 57 }]);

    scope = aw.scopes[3];
    expect(scope.name).toEqual('m1');
    expect(scope.parent!.name).toEqual('A');
    expect(scope.assignments).toIncludeSameMembers([{ key: 'c', value: StandardVariableType.String, spanStart: 85 }]);

    scope = aw.scopes[4];
    expect(scope.name).toEqual('B');
    expect(scope.parent!.name).toEqual('<module>');
    expect(scope.assignments).toIncludeSameMembers([{ key: 'd', value: StandardVariableType.Int, spanStart: 124 }]);

    scope = aw.scopes[5];
    expect(scope.name).toEqual('m1');
    expect(scope.parent!.name).toEqual('B');
    expect(scope.assignments).toIncludeSameMembers([{ key: 'e', value: StandardVariableType.Int, spanStart: 152 }]);

    scope = aw.scopes[6];
    expect(scope.name).toEqual('m6');
    expect(scope.parent!.name).toEqual('B');
    expect(scope.assignments).toIncludeSameMembers([{ key: 'f', value: StandardVariableType.Int, spanStart: 197 }]);
});

test('IntelliCode assignment walker: functions', () => {
    const code = `
def func():
    return 1

x = func();
y = x.bitlength()
`;
    const aw = walkCode(code);
    expect(aw.scopes).toBeArrayOfSize(2);
    expect(aw.scopes[1].assignments).toBeEmpty();

    const assignments = aw.scopes[0].assignments;
    expect(assignments).toIncludeSameMembers([
        { key: 'x', value: 'func', spanStart: 35 },
        { key: 'y', value: 'func.bitlength', spanStart: 44 }
    ]);
});

test('IntelliCode assignment walker: import', () => {
    const code = `
import os.path as p, sys as s
`;
    const aw = walkCode(code);
    expect(aw.scopes).toBeArrayOfSize(1);

    const assignments = aw.scopes[0].assignments;
    expect(assignments).toIncludeSameMembers([
        { key: 'p', value: 'os.path', spanStart: 15 },
        { key: 's', value: 'sys', spanStart: 25 }
    ]);
});

test('IntelliCode assignment walker: from import', () => {
    const code = `
from os import path as p
`;
    const aw = walkCode(code);
    expect(aw.scopes).toBeArrayOfSize(1);

    const assignments = aw.scopes[0].assignments;
    expect(assignments).toIncludeSameMembers([{ key: 'p', value: 'os.path', spanStart: 20 }]);
});

test('IntelliCode assignment walker: with', () => {
    const code = `
with open('file', 'r') as f:
    f.close()
`;
    const aw = walkCode(code);
    expect(aw.scopes).toBeArrayOfSize(1);

    const assignments = aw.scopes[0].assignments;
    expect(assignments).toIncludeSameMembers([{ key: 'f', value: 'open', spanStart: 10 }]);
});

test('IntelliCode assignment walker: for', () => {
    const code = `
y = [1, 2, 3]
for x in y
    print(x)
`;
    const aw = walkCode(code);
    expect(aw.scopes).toBeArrayOfSize(1);

    const assignments = aw.scopes[0].assignments;
    expect(assignments).toIncludeSameMembers([
        { key: 'y', value: StandardVariableType.List, spanStart: 1 },
        { key: 'x', value: `${StandardVariableType.List}.element_inside`, spanStart: 20 }
    ]);
});

test('IntelliCode assignment walker: comprehension for', () => {
    const code = `
chars = [ ch for ch in 'text' ]
`;
    const aw = walkCode(code);
    expect(aw.scopes).toBeArrayOfSize(1);

    const assignments = aw.scopes[0].assignments;
    expect(assignments).toIncludeSameMembers([{ key: 'chars', value: StandardVariableType.List, spanStart: 1 }]);
});
