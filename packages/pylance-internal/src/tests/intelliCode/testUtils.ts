/*
 * testUtils.ts
 *
 * IntelliCode test utilities.
 */
import 'jest-extended';

import * as path from 'path';

import { DiagnosticSink } from 'pyright-internal/common/diagnosticSink';
import { ParseOptions, Parser, ParseResults } from 'pyright-internal/parser/parser';

import { AssignmentWalker } from '../../intelliCode/assignmentWalker';
import { ExpressionWalker } from '../../intelliCode/expressionWalker';
import { EditorInvocation, ModelZipFileName } from '../../intelliCode/models';
import { EditorLookBackTokenGenerator } from '../../intelliCode/tokens/editorTokenGenerator';

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

export function getParseResultsAndWalkExpressions(code: string): [ParseResults, ExpressionWalker] {
    const parseResults = parseCode(code);
    const aw = walkAssignments(code);
    aw.walk(parseResults.parseTree);
    const ew = new ExpressionWalker(aw.scopes);
    ew.walk(parseResults.parseTree);
    return [parseResults, ew];
}

export function getInference(code: string, position: number): EditorInvocation | undefined {
    const [parseResults, ew] = getParseResultsAndWalkExpressions(code);
    const tg = new EditorLookBackTokenGenerator();
    return tg.generateLookbackTokens(parseResults, ew, position, 100);
}

export function verifyKeys<K, V>(map: Map<K, V>, expected: K[]): void {
    const keys: K[] = [];
    map.forEach((value: V, key: K) => {
        keys.push(key);
    });
    expect(keys).toIncludeSameMembers(expected);
}

export function getTestModel(): string {
    const srcFolder = process.cwd();
    return path.join(srcFolder, 'src', 'tests', 'intelliCode', 'data', ModelZipFileName);
}
