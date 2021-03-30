/*
 * expressionWalker.test.ts
 *
 * IntelliCode expression walker tests.
 */

import 'jest-extended';

import { StandardVariableType } from '../../intelliCode/types';
import { getParseResultsAndWalkExpressions } from './testUtils';

function walkExpressions(code: string) {
    const [_, ew] = getParseResultsAndWalkExpressions(code);
    return ew;
}

function verifySingle(code: string, key: string, value: string | undefined, spanStart: number) {
    const ew = walkExpressions(code);
    const mi = ew.methodInvokations;
    expect(mi).toIncludeSameMembers([{ key, value, spanStart }]);
}

describe('IntelliCode expression walker', () => {
    test('module members', () => {
        const code = `
import os
os.mkdir()
`;
        verifySingle(code, 'os', 'mkdir', 13);
    });

    test('module member chain', () => {
        const code = `
import os
os.path.abspath()
`;
        const ew = walkExpressions(code);
        const mi = ew.methodInvokations;
        expect(mi).toIncludeSameMembers([
            { key: 'os', value: 'path', spanStart: 13 },
            { key: 'os.path', value: 'abspath', spanStart: 17 },
        ]);
    });

    test('module multiple use', () => {
        const code = `
import os
os.mkdir()
os.path.abspath()
`;
        const ew = walkExpressions(code);
        const mi = ew.methodInvokations;
        expect(mi).toIncludeSameMembers([
            { key: 'os', value: 'mkdir', spanStart: 13 },
            { key: 'os', value: 'path', spanStart: 24 },
            { key: 'os.path', value: 'abspath', spanStart: 28 },
        ]);
    });

    test('collections', () => {
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
            { key: StandardVariableType.Dictionary, value: 'fromkeys', spanStart: 69 },
        ]);
    });

    test('constants', () => {
        const code = `
'a'.count()
2.1.conjugate()
`;
        const ew = walkExpressions(code);
        const mi = ew.methodInvokations;
        expect(mi).toIncludeSameMembers([
            { key: StandardVariableType.String, value: 'count', spanStart: 4 },
            { key: StandardVariableType.Float, value: 'conjugate', spanStart: 16 },
        ]);
    });

    test('index', () => {
        const code = `
x = ['a', 'b']
x[1].count()
`;
        verifySingle(code, StandardVariableType.String, 'count', 17);
    });

    test('error constants', () => {
        verifySingle(`'a'.`, StandardVariableType.String, undefined, 3);
        verifySingle('1.0.', StandardVariableType.Int, undefined, 3);
    });

    test('error module member', () => {
        const code = `
import os
os.
`;
        verifySingle(code, 'os', undefined, 13);
    });

    test('error collections', () => {
        verifySingle(`{1: 'a', 2: 'b'}.`, StandardVariableType.Dictionary, undefined, 16);
        verifySingle(`[1, 2, 3].`, StandardVariableType.List, undefined, 9);
        verifySingle(`(1, 'a').`, StandardVariableType.Tuple, undefined, 8);
        verifySingle(`{1, 'a'}.`, StandardVariableType.Set, undefined, 8);
    });

    test('sklearn sample', () => {
        const code = `
import numpy as np    
from sklearn import LinearDiscriminantAnalysis

a = b = 1
y = 1
x = np.hstack([x, np.random.randn(a, b - 1)])
clf1 = LinearDiscriminantAnalysis(solver='lsqr', shrinkage='auto').fit(x, y)
`;
        const ew = walkExpressions(code);
        const mi = ew.methodInvokations;
        expect(mi).toIncludeSameMembers([
            { key: 'numpy', value: 'hstack', spanStart: 94 },
            { key: 'numpy.random', value: 'randn', spanStart: 114 },
            { key: 'numpy', value: 'random', spanStart: 108 },
            { key: 'sklearn.LinearDiscriminantAnalysis', value: 'fit', spanStart: 167 },
        ]);
    });

    test('incomplete call chain', () => {
        const code = `
from a import b
z = b(1, 2, 3).fit(x, y).`;
        const ew = walkExpressions(code);
        const mi = ew.methodInvokations;
        expect(mi).toIncludeSameMembers([
            { key: 'a.b', value: 'fit', spanStart: 22 },
            { key: 'a.b.fit', value: undefined, spanStart: 25 },
        ]);
    });

    test('tensorflow', () => {
        const code = `
import tensorflow as tf
o = tf.train.`;
        const ew = walkExpressions(code);
        const mi = ew.methodInvokations;
        expect(mi).toIncludeSameMembers([
            { key: 'tensorflow', value: 'train', spanStart: 31 },
            { key: 'tensorflow.train', value: undefined, spanStart: 36 },
        ]);
    });
});
