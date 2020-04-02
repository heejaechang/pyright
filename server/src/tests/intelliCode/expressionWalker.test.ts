/*
 * expressionWalker.test.ts
 *
 * IntelliCode expression walker tests.
 */

import 'jest-extended';

import { StandardVariableType } from '../../../intelliCode/types';
import { walkExpressions } from './testUtils';

function verifySingle(code: string, key: string, value: string | undefined, spanStart: number) {
    const ew = walkExpressions(code);
    const mi = ew.methodInvokations;
    expect(mi).toIncludeSameMembers([{ key, value, spanStart }]);
}

test('IntelliCode expression walker: module members', () => {
    const code = `
import os
os.mkdir()
`;
    verifySingle(code, 'os', 'mkdir', 13);
});

test('IntelliCode expression walker: module member chain', () => {
    const code = `
import os
os.path.abspath()
`;
    const ew = walkExpressions(code);
    const mi = ew.methodInvokations;
    expect(mi).toIncludeSameMembers([
        { key: 'os.path', value: 'abspath', spanStart: 13 },
        { key: 'os', value: 'path', spanStart: 13 }
    ]);
});

test('IntelliCode expression walker: module multiple use', () => {
    const code = `
import os
os.mkdir()
os.path.abspath()
`;
    const ew = walkExpressions(code);
    const mi = ew.methodInvokations;
    expect(mi).toIncludeSameMembers([
        { key: 'os', value: 'mkdir', spanStart: 13 },
        { key: 'os.path', value: 'abspath', spanStart: 24 },
        { key: 'os', value: 'path', spanStart: 24 }
    ]);
});

test('IntelliCode expression walker: collections', () => {
    const code = `
[1, 2].append()
{1, 2}.add()
(1, 2).count()
{'name': 'Bob', age: 20}.fromkeys()
`;
    const ew = walkExpressions(code);
    const mi = ew.methodInvokations;
    expect(mi).toIncludeSameMembers([
        { key: StandardVariableType.List, value: 'append', spanStart: 7 },
        { key: StandardVariableType.Set, value: 'add', spanStart: 23 },
        { key: StandardVariableType.Tuple, value: 'count', spanStart: 36 },
        { key: StandardVariableType.Dictionary, value: 'fromkeys', spanStart: 69 }
    ]);
});

test('IntelliCode expression walker: constants', () => {
    const code = `
'a'.count()
2.1.conjugate()
`;
    const ew = walkExpressions(code);
    const mi = ew.methodInvokations;
    expect(mi).toIncludeSameMembers([
        { key: StandardVariableType.String, value: 'count', spanStart: 4 },
        { key: StandardVariableType.Float, value: 'conjugate', spanStart: 16 }
    ]);
});

test('IntelliCode expression walker: index', () => {
    const code = `
x = ['a', 'b']
x[1].count()
`;
    verifySingle(code, StandardVariableType.String, 'count', 17);
});

test('IntelliCode expression walker: error constants', () => {
    verifySingle(`'a'.`, StandardVariableType.String, undefined, 3);
    verifySingle('1.0.', StandardVariableType.Int, undefined, 3);
});

test('IntelliCode expression walker: error module member', () => {
    const code = `
import os
os.
`;
    verifySingle(code, 'os', undefined, 13);
});

test('IntelliCode expression walker: error collections', () => {
    verifySingle(`{1: 'a', 2: 'b'}.`, StandardVariableType.Dictionary, undefined, 16);
    verifySingle(`[1, 2, 3].`, StandardVariableType.List, undefined, 9);
    verifySingle(`(1, 'a').`, StandardVariableType.Tuple, undefined, 8);
    verifySingle(`{1, 'a'}.`, StandardVariableType.Set, undefined, 8);
});
