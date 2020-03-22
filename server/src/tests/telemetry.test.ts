/*
 * telemetry.test.ts
 *
 * Telemetry service tests.
 */

import * as assert from 'assert';
import { mock, when, verify, capture, instance } from 'ts-mockito';
import { IConnection, Telemetry } from 'vscode-languageserver';
import { TelemetryServiceImplementation } from '../services/telemetry';
import {
    sendExceptionTelemetry,
    TelemetryEventName,
    TelemetryEvent,
    eventNamePrefix,
    TelemetryService,
    sendMeasurementsTelemetry
} from '../common/telemetry';

let ts: TelemetryService;
let mockedTelemetry: Telemetry;

beforeEach(() => {
    const mockedConnection = mock<IConnection>();
    mockedTelemetry = mock<Telemetry>();
    const telemetry = instance(mockedTelemetry);

    when(mockedConnection.telemetry).thenReturn(telemetry);
    const connection = instance(mockedConnection);

    ts = new TelemetryServiceImplementation(connection);
});

test('Telemetry: send exception', () => {
    const e = new Error();
    e.name = 'name';
    e.stack = 'stack';
    sendExceptionTelemetry(ts, TelemetryEventName.EXCEPTION, e);

    const [arg] = capture(mockedTelemetry.logEvent).first();
    const te = arg as TelemetryEvent;

    verify(mockedTelemetry.logEvent(te)).once();
    assert(te instanceof TelemetryEvent);
    assert(te.EventName === `${eventNamePrefix}${TelemetryEventName.EXCEPTION}`);
    assert(te.Properties['exception-name'] === 'name');
    assert(te.Properties['exception-call-stack'] === 'stack');
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
    assert(te.EventName === `${eventNamePrefix}${TelemetryEventName.ANALYSIS_COMPLETE}`);
    assert(te.Measurements['m1'] === 1);
    assert(te.Measurements['m2'] === 2);
});
