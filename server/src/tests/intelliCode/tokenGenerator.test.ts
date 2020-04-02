/*
 * expressionWalker.test.ts
 *
 * IntelliCode expression walker tests.
 */

import 'jest-extended';

import { EditorInvocation } from '../../../intelliCode/models';
import { EditorLookBackTokenGenerator } from '../../../intelliCode/tokens/editorTokenGenerator';
import { StandardVariableType } from '../../../intelliCode/types';
import { ModuleNode } from '../../../pyright/server/src/parser/parseNodes';
import { walkExpressions } from './testUtils';

function getInference(code: string, position: number): EditorInvocation | undefined {
    const ew = walkExpressions(code);
    const tg = new EditorLookBackTokenGenerator();
    return tg.generateLookbackTokens(ew.scopes[0].node as ModuleNode, code, ew, 100, position);
}

test('IntelliCode token generator: empty', () => {
    const code = ``;
    const ei = getInference(code, 0);
    expect(ei).toBeUndefined();
});

test('IntelliCode token generator: module member', () => {
    const code = `
import os    
os. `;
    const ei = getInference(code, code.length - 1);
    expect(ei).toBeDefined();
    expect(ei!.type).toEqual('os');
    expect(ei!.spanStart).toEqual(17);
});

test('IntelliCode token generator: module member return', () => {
    const code = `
import os    
os.mkdir(). `;
    const ei = getInference(code, code.length - 1);
    expect(ei).toBeDefined();
    expect(ei!.type).toEqual('os.mkdir');
    expect(ei!.spanStart).toEqual(25);
});

test('IntelliCode token generator: module member return', () => {
    const code = `
x = [1, 2, 3]
x[1]. `;
    const ei = getInference(code, code.length - 1);
    expect(ei).toBeDefined();
    // Type of each list/dictionary item is assigned as String by default.
    // Default recommendation list will filter out String's recommendation
    // list if actual type is not string.
    expect(ei!.type).toEqual(StandardVariableType.String);
    expect(ei!.spanStart).toEqual(19);
});

test('IntelliCode token generator: expression in braces', () => {
    const code = `
import os    
(os). `;
    const ei = getInference(code, code.length - 1);
    expect(ei).toBeDefined();
    expect(ei!.type).toEqual('os');
    expect(ei!.spanStart).toEqual(19);
});

test('IntelliCode token generator: constant string', () => {
    const code = `
'str'. `;
    const ei = getInference(code, code.length - 1);
    expect(ei).toBeDefined();
    expect(ei!.type).toEqual(StandardVariableType.String);
    expect(ei!.spanStart).toEqual(6);
});

test('IntelliCode token generator: constant number', () => {
    const code = `
1.0. `;
    const ei = getInference(code, code.length - 1);
    // IntelliCode does not suggest on numerics.
    expect(ei).toBeUndefined();
});

test('IntelliCode token generator: numerics', () => {
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
