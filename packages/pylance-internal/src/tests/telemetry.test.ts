/*
 * telemetry.test.ts
 *
 * Telemetry service tests.
 */

import assert from 'assert';
import { capture, instance, mock, verify, when } from 'ts-mockito';
import { Connection, Telemetry } from 'vscode-languageserver';

import {
    formatEventName,
    sendExceptionTelemetry,
    TelemetryEvent,
    TelemetryEventName,
    TelemetryService,
} from '../common/telemetry';

let ts: TelemetryService;
let mockedTelemetry: Telemetry;

describe('Telemetry', () => {
    beforeEach(() => {
        const mockedConnection = mock<Connection>();
        mockedTelemetry = mock<Telemetry>();
        const telemetry = instance(mockedTelemetry);

        when(mockedConnection.telemetry).thenReturn(telemetry);
        const connection = instance(mockedConnection);

        ts = new TelemetryService(connection);
    });

    [undefined, 'Stack'].forEach((stack) => {
        test(`send exception with stack '${stack ?? 'undefined'}'`, () => {
            const e: Error = {
                message: 'Message',
                name: 'Name',
                stack,
            };

            sendExceptionTelemetry(ts, TelemetryEventName.INTELLICODE_MODEL_LOAD_FAILED, e);
            const [arg] = capture(mockedTelemetry.logEvent).first();
            const te = arg as TelemetryEvent;

            verify(mockedTelemetry.logEvent(te)).once();
            assert(te instanceof TelemetryEvent);

            expect(te.EventName).toEqual(formatEventName(TelemetryEventName.INTELLICODE_MODEL_LOAD_FAILED));
            expect(te.Exception).toEqual(e);
        });
    });
});
