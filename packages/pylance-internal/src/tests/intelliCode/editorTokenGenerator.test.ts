/*
 * expressionWalker.test.ts
 *
 * IntelliCode expression walker tests.
 */

import 'jest-extended';

import { EditorInvocation } from '../../intelliCode/models';
import { EditorLookBackTokenGenerator } from '../../intelliCode/tokens/editorTokenGenerator';
import { StandardVariableType } from '../../intelliCode/types';
import { getParseResultsAndWalkExpressions } from './testUtils';

function getInference(code: string, position: number): EditorInvocation | undefined {
    const [parseRestuls, ew] = getParseResultsAndWalkExpressions(code);
    const tg = new EditorLookBackTokenGenerator();
    return tg.generateLookbackTokens(parseRestuls, ew, position, 100);
}

function verifySingle(code: string, type: string, spanStart: number, position?: number): EditorInvocation {
    const ei = getInference(code, position || code.length - 1);
    expect(ei).toBeDefined();
    expect(ei!.type).toEqual(type);
    expect(ei!.spanStart).toEqual(spanStart);
    return ei!;
}

describe('IntelliCode editor token generator', () => {
    test('empty', () => {
        const code = ``;
        const ei = getInference(code, 0);
        expect(ei).toBeUndefined();
    });

    test('simple string', () => {
        const code = `
s = 'str'
s. `;
        const ei = verifySingle(code, StandardVariableType.String, 12);
        const expectedTokens = ['\n', 's', '=', 'STR_LIT', '\n', 'str', '.'];
        expect(ei.lookbackTokens).toIncludeSameMembers(expectedTokens);
    });

    test('module member', () => {
        const code = `
import os    
os. `;
        verifySingle(code, 'os', 17);
    });

    test('module member return 1', () => {
        const code = `
import os    
os.mkdir('dir'). `;
        verifySingle(code, 'os.mkdir', 30);
    });

    test('array element', () => {
        const code = `
x = [1, 2, 3]
x[1]. `;
        // Type of each list/dictionary item is assigned as String by default.
        // Default recommendation list will filter out String's recommendation
        // list if actual type is not string.
        verifySingle(code, StandardVariableType.String, 19);
    });

    test('expression in braces', () => {
        const code = `
import os    
(os). `;
        verifySingle(code, 'os', 19);
    });

    test('constant string', () => {
        const code = `
'str'. `;
        verifySingle(code, StandardVariableType.String, 6);
    });

    test('constant number', () => {
        const code = `
1.0. `;
        const ei = getInference(code, code.length - 1);
        // IntelliCode does not suggest on numerics.
        expect(ei).toBeUndefined();
    });

    test('numerics', () => {
        let code = 'languages=data[questionNames[year]]. ';
        let ei = getInference(code, code.length - 1);
        expect(ei).toBeDefined();

        code = 'summary.sum(axis=1). ';
        ei = getInference(code, code.length - 1);
        expect(ei).toBeDefined();

        code = `{1:'a', 2:'b'}. `;
        ei = getInference(code, code.length - 1);
        expect(ei).toBeDefined();

        // IntelliCode does not suggest on numerics.
        code = 'W = tf.Variable([. ';
        ei = getInference(code, code.length - 1);
        expect(ei).toBeUndefined();

        code = 'W = tf.Variable([-. ';
        ei = getInference(code, code.length - 1);
        expect(ei).toBeUndefined();

        code = 'W = tf.Variable([-0. ';
        ei = getInference(code, code.length - 1);
        expect(ei).toBeUndefined();
    });

    // TODO: see if we can fix completion type in the middle of an expression.
    // test('complete inside expression', () => {
    //     const code = `
    // from a import b
    // z = b(1, 2, 3).fit(x, y)`;
    //     verifySingle(code, 'a.b', 31, code.length - 9);
    // });

    test('remove arguments', () => {
        const code = `
from a import b
z = b(1, 2, 3).fit(x, y). `;
        verifySingle(code, 'a.b.fit', 41);
    });
});
