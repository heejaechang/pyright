/*
 * telemetry.test.ts
 *
 * Telemetry service tests.
 */

import assert from 'assert';
import { capture, instance, mock, verify, when } from 'ts-mockito';
import { Connection, Telemetry } from 'vscode-languageserver/node';

import { formatEventName, TelemetryEvent, TelemetryEventName, TelemetryService } from '../common/telemetry';

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

    test('send measurements', () => {
        const m: {
            [key: string]: number;
        } = {};

        m['m1'] = 1;
        m['m2'] = 2;
        ts.sendMeasurementsTelemetry(TelemetryEventName.ANALYSIS_COMPLETE, m);

        const [arg] = capture(mockedTelemetry.logEvent).first();
        const te = arg as TelemetryEvent;

        verify(mockedTelemetry.logEvent(te)).once();
        assert(te instanceof TelemetryEvent);
        expect(te.EventName === formatEventName(TelemetryEventName.ANALYSIS_COMPLETE));
        expect(te.Measurements['m1']).toEqual(1);
        expect(te.Measurements['m2']).toEqual(2);
    });

    [undefined, 'Stack'].forEach((stack) => {
        test(`send exception with stack '${stack ?? 'undefined'}'`, () => {
            const e: Error = {
                message: 'Message',
                name: 'Name',
                stack,
            };

            ts.sendExceptionTelemetry(TelemetryEventName.INTELLICODE_MODEL_LOAD_FAILED, e);
            const [arg] = capture(mockedTelemetry.logEvent).first();
            const te = arg as TelemetryEvent;

            verify(mockedTelemetry.logEvent(te)).once();
            assert(te instanceof TelemetryEvent);

            expect(te.EventName).toEqual(formatEventName(TelemetryEventName.INTELLICODE_MODEL_LOAD_FAILED));
            expect(te.Exception).toEqual(e);
        });
    });
});
