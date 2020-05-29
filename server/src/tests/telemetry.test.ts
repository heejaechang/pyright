/*
 * telemetry.test.ts
 *
 * Telemetry service tests.
 */

import * as assert from 'assert';
import { capture, instance, mock, verify, when } from 'ts-mockito';
import { IConnection, Telemetry } from 'vscode-languageserver';

import {
    formatEventName,
    sendMeasurementsTelemetry,
    TelemetryEvent,
    TelemetryEventName,
    TelemetryService,
} from '../common/telemetry';

let ts: TelemetryService;
let mockedTelemetry: Telemetry;

beforeEach(() => {
    const mockedConnection = mock<IConnection>();
    mockedTelemetry = mock<Telemetry>();
    const telemetry = instance(mockedTelemetry);

    when(mockedConnection.telemetry).thenReturn(telemetry);
    const connection = instance(mockedConnection);

    ts = new TelemetryService(connection);
});

test('Telemetry: send measurements', () => {
    const m: {
        [key: string]: number;
    } = {};

    m['m1'] = 1;
    m['m2'] = 2;
    sendMeasurementsTelemetry(ts, TelemetryEventName.ANALYSIS_COMPLETE, m);

    const [arg] = capture(mockedTelemetry.logEvent).first();
    const te = arg as TelemetryEvent;

    verify(mockedTelemetry.logEvent(te)).once();
    assert(te instanceof TelemetryEvent);
    assert(te.EventName === formatEventName(TelemetryEventName.ANALYSIS_COMPLETE));
    assert(te.Measurements['m1'] === 1);
    assert(te.Measurements['m2'] === 2);
});
