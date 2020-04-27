/*
 * testUtils.ts
 *
 * IntelliCode test utilities.
 */
import 'jest-extended';

import * as realFs from 'fs';
import * as path from 'path';
import { anyString, anything, capture, verify } from 'ts-mockito';

import { AssignmentWalker } from '../../../intelliCode/assignmentWalker';
import { ExpressionWalker } from '../../../intelliCode/expressionWalker';
import { DiagnosticSink } from '../../../pyright/server/src/common/diagnosticSink';
import { ParseOptions, Parser, ParseResults } from '../../../pyright/server/src/parser/parser';
import { LogLevel, LogService } from '../../common/logger';
import { formatEventName, TelemetryEventName, TelemetryService } from '../../common/telemetry';

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

export function verifyKeys<K, V>(map: Map<K, V>, expected: K[]): void {
    const keys: K[] = [];
    map.forEach((value: V, key: K) => {
        keys.push(key);
    });
    expect(keys).toIncludeSameMembers(expected);
}

export function prepareTestModel(dstFolderName: string): void {
    const srcFolder = process.cwd();
    const testModelPath = path.join(srcFolder, 'src', 'tests', 'intelliCode', 'data', 'model.zip');
    const icFolder = path.join(dstFolderName, 'IntelliCode');

    realFs.mkdirSync(icFolder);
    realFs.copyFileSync(testModelPath, path.join(icFolder, 'model.zip'));
}

export function verifyErrorLog(mockedLog: LogService, message: string): void {
    verify(mockedLog.log(LogLevel.Error, anyString())).once();
    const [l, m] = capture(mockedLog.log).first();
    expect(l).toEqual(LogLevel.Error);
    expect(m).toStartWith(message);
}

export function verifyErrorTelemetry(mockedTelemetry: TelemetryService): void {
    verify(mockedTelemetry.sendTelemetry(anything())).once();
    const [te] = capture(mockedTelemetry.sendTelemetry).first();
    expect(te.EventName).toEqual(formatEventName(TelemetryEventName.EXCEPTION_IC));
    expect(te.Properties['exception-name']).toStartWith('Error');
}
