/*
 * expressionWalker.test.ts
 *
 * IntelliCode expression walker tests.
 */

import 'jest-extended';

import { TrainingInvocations } from '../../intelliCode/models';
import { TrainingLookBackTokenGenerator } from '../../intelliCode/tokens/trainingTokenGenerator';
import { getParseResultsAndWalkExpressions, verifyKeys } from './testUtils';

function getInference(code: string): Map<string, Map<string, TrainingInvocations>> | undefined {
    const [parseResults, ew] = getParseResultsAndWalkExpressions(code);
    const tg = new TrainingLookBackTokenGenerator();
    return tg.generateLookbackTokens(parseResults, ew, 100);
}

describe('IntelliCode token generator', () => {
    test('literal replacement', () => {
        const code = `
import os
x = 1
y = x = 'str'
os.mkdir()
`;
        const inf = getInference(code);
        expect(inf).toBeDefined();

        const key = 'os';
        const value = inf!.get(key);
        expect(value).toBeDefined();

        const mkdir = value!.get('mkdir');
        expect(mkdir).toBeDefined();
        expect(mkdir?.spanStart[0]).toEqual(34);

        const expectedTokens = [
            '\n',
            'import',
            'os',
            '\n',
            'x',
            '=',
            'NUM_LIT',
            '\n',
            'y',
            '=',
            'x',
            '=',
            'STR_LIT',
            '\n',
            'os',
            '.',
            'mkdir',
        ];
        expect(mkdir!.lookbackTokens[0]).toIncludeSameMembers(expectedTokens);
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
        const inf = getInference(code);
        expect(inf).toBeDefined();
        verifyKeys(inf!, ['numpy', 'numpy.random', 'sklearn.LinearDiscriminantAnalysis']);

        const numpy = inf!.get('numpy');
        expect(numpy).toBeDefined();
        verifyKeys(numpy!, ['hstack', 'random']);
        expect(numpy!.get('hstack')?.spanStart[0]).toEqual(91);
        expect(numpy!.get('random')?.spanStart[0]).toEqual(105);

        const numpy_random = inf!.get('numpy.random');
        expect(numpy_random).toBeDefined();
        verifyKeys(numpy_random!, ['randn']);
        expect(numpy_random!.get('randn')?.spanStart[0]).toEqual(112);

        const skld = inf!.get('sklearn.LinearDiscriminantAnalysis');
        expect(skld).toBeDefined();
        verifyKeys(skld!, ['fit']);
        expect(skld!.get('fit')?.spanStart[0]).toEqual(197);
    });

    test('remove arguments', () => {
        const code = `
import os
os.mkdir(a)
`;
        const inf = getInference(code);
        expect(inf).toBeDefined();
        verifyKeys(inf!, ['os']);

        const os = inf!.get('os');
        expect(os).toBeDefined();
        verifyKeys(os!, ['mkdir']);

        const mkdir = os!.get('mkdir');
        expect(mkdir?.spanStart[0]).toEqual(14);

        const expectedTokens = ['\n', 'import', 'os', '\n', 'os', '.', 'mkdir'];
        expect(mkdir!.lookbackTokens[0]).toIncludeSameMembers(expectedTokens);
    });

    test('from import', () => {
        const code = `
from a import b
z = b(1, 2, 3).fit(x, y)
`;
        const inf = getInference(code);
        expect(inf).toBeDefined();
        verifyKeys(inf!, ['a.b']);

        const os = inf!.get('a.b');
        expect(os).toBeDefined();
        verifyKeys(os!, ['fit']);

        const fit = os!.get('fit');
        expect(fit?.spanStart[0]).toEqual(32);

        const expectedTokens = ['\n', 'from', 'a', 'import', 'a.b', '\n', 'z', '=', 'a.b', '.', 'fit'];
        expect(fit!.lookbackTokens[0]).toIncludeSameMembers(expectedTokens);
    });

    test('method in call arguments', () => {
        const code = `
import tensorflow as tf
tf.placeholder(tf.float32)
`;
        const inf = getInference(code);
        expect(inf).toBeDefined();
        verifyKeys(inf!, ['tensorflow']);

        const tf = inf!.get('tensorflow');
        expect(tf).toBeDefined();
        verifyKeys(tf!, ['placeholder', 'float32']);

        const f32 = tf!.get('float32');
        expect(f32?.spanStart[0]).toEqual(43);

        const expectedTokens = [
            '\n',
            'import',
            'tensorflow',
            'as',
            'tensorflow',
            '\n',
            'tensorflow',
            '.',
            'placeholder',
            'tensorflow',
            '.',
            'float32',
        ];
        expect(f32!.lookbackTokens[0]).toIncludeSameMembers(expectedTokens);
    });

    test('call arguments', () => {
        const code = `
print("a: {}".format(a))
`;
        const inf = getInference(code);
        expect(inf).toBeDefined();
        verifyKeys(inf!, ['str']);

        const s = inf!.get('str');
        expect(s).toBeDefined();
        verifyKeys(s!, ['format']);

        const f = s!.get('format');
        expect(f?.spanStart[0]).toEqual(15);

        const expectedTokens = ['\n', 'print', 'str', '.', 'format'];
        expect(f!.lookbackTokens[0]).toIncludeSameMembers(expectedTokens);
    });
});
