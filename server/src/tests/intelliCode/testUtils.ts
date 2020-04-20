/*
 * testUtils.ts
 *
 * IntelliCode test utilities.
 */
import 'jest-extended';

import { AssignmentWalker } from '../../../intelliCode/assignmentWalker';
import { ExpressionWalker } from '../../../intelliCode/expressionWalker';
import { DiagnosticSink } from '../../../pyright/server/src/common/diagnosticSink';
import { ParseOptions, Parser, ParseResults } from '../../../pyright/server/src/parser/parser';

export function parseCode(code: string): ParseResults {
    const parser = new Parser();
    return parser.parseSourceFile(code, new ParseOptions(), new DiagnosticSink());
}

export function walkAssignments(code: string): AssignmentWalker {
    const pr = parseCode(code);
    const aw = new AssignmentWalker(pr.parseTree);
    aw.walk(pr.parseTree);
    return aw;
}

export function walkExpressions(code: string): ExpressionWalker {
    const pr = parseCode(code);
    const aw = walkAssignments(code);
    aw.walk(pr.parseTree);
    const ew = new ExpressionWalker(aw.scopes);
    ew.walk(pr.parseTree);
    return ew;
}

export function verifyKeys<K, V>(map: Map<K, V>, expected: K[]) {
    const keys: K[] = [];
    map.forEach((value: V, key: K) => {
        keys.push(key);
    });
    expect(expected).toIncludeSameMembers(keys);
}
