/*
 * testUtils.ts
 *
 * IntelliCode test utilities.
 */
import 'jest-extended';

import * as realFs from 'fs';
import * as path from 'path';
import { anyString, anything, capture, instance, mock, verify, when } from 'ts-mockito';

import { AssignmentWalker } from '../../../intelliCode/assignmentWalker';
import { ExpressionWalker } from '../../../intelliCode/expressionWalker';
import { EditorInvocation, ModelZipAcquisitionService, ModelZipFileName } from '../../../intelliCode/models';
import { EditorLookBackTokenGenerator } from '../../../intelliCode/tokens/editorTokenGenerator';
import { DiagnosticSink } from '../../../pyright/server/src/common/diagnosticSink';
import { ModuleNode } from '../../../pyright/server/src/parser/parseNodes';
import { ParseOptions, Parser, ParseResults } from '../../../pyright/server/src/parser/parser';
import { LogLevel, LogService } from '../../common/logger';
import { formatEventName, TelemetryEventName, TelemetryService } from '../../common/telemetry';

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

// Copy IntelliCode model zip file from test data location to the specified folder (typically temp).
// Return mock of the ModelZipAcquisitionService that provides path to the 'downloaded' zip file.
export function prepareTestModel(dstFolderName: string): ModelZipAcquisitionService {
    const srcFolder = process.cwd();
    const testModelPath = path.join(srcFolder, 'src', 'tests', 'intelliCode', 'data', ModelZipFileName);

    realFs.mkdirSync(dstFolderName, { recursive: true });
    const modelZip = path.join(dstFolderName, ModelZipFileName);
    realFs.copyFileSync(testModelPath, modelZip);

    return mockModelService(modelZip);
}

export function mockModelService(modelZip: string): ModelZipAcquisitionService {
    const modelService = mock<ModelZipAcquisitionService>();
    when(modelService.getModel()).thenReturn(Promise.resolve(modelZip));
    return instance(modelService);
}

export function verifyErrorLog(mockedLog: LogService, message: string, callNo?: number): void {
    verify(mockedLog.log(LogLevel.Error, anyString())).once();
    let callArgs: any;
    if (!callNo || callNo === 1) {
        callArgs = capture(mockedLog.log).first();
    } else if (callNo === 2) {
        callArgs = capture(mockedLog.log).second();
    } else if (callNo === 3) {
        callArgs = capture(mockedLog.log).third();
    }
    expect(callArgs[0]).toEqual(LogLevel.Error);
    expect(callArgs[1]).toStartWith(message);
}

export function verifyErrorTelemetry(mockedTelemetry: TelemetryService): void {
    verify(mockedTelemetry.sendTelemetry(anything())).once();
    const [te] = capture(mockedTelemetry.sendTelemetry).first();
    expect(te.EventName).toEqual(formatEventName(TelemetryEventName.EXCEPTION_IC));
    expect(te.Properties['exception-name']).toStartWith('Error');
}
