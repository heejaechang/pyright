/*
 * testUtils.ts
 *
 * IntelliCode test utilities.
 */
import 'jest-extended';

import * as path from 'path';
import { anyString, capture, verify } from 'ts-mockito';

import { AssignmentWalker } from '../../../intelliCode/assignmentWalker';
import { ExpressionWalker } from '../../../intelliCode/expressionWalker';
import { EditorInvocation, ModelZipFileName } from '../../../intelliCode/models';
import { EditorLookBackTokenGenerator } from '../../../intelliCode/tokens/editorTokenGenerator';
import { LogLevel } from '../../../pyright/server/src/common/console';
import { DiagnosticSink } from '../../../pyright/server/src/common/diagnosticSink';
import { ModuleNode } from '../../../pyright/server/src/parser/parseNodes';
import { ParseOptions, Parser, ParseResults } from '../../../pyright/server/src/parser/parser';
import { LogService } from '../../common/logger';

export const clientServerModelLocation = '../../../../client/server/intelliCode/model';

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

export function getInference(code: string, position: number): EditorInvocation | undefined {
    const ew = walkExpressions(code);
    const tg = new EditorLookBackTokenGenerator();
    return tg.generateLookbackTokens(ew.scopes[0].node as ModuleNode, code, ew, position, 100);
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

export function verifyErrorLog(mockedLog: LogService, message: string): void {
    verify(mockedLog.log(LogLevel.Error, anyString())).once();
    const callArgs = capture(mockedLog.log).first();
    expect(callArgs[0]).toEqual(LogLevel.Error);
}
