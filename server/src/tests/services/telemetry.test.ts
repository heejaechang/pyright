/*
 * telemetry.test.ts
 *
 * Telemetry service tests.
 */

import * as assert from 'assert';
import { mock, when, verify, capture, instance } from 'ts-mockito';
import { IConnection, Telemetry } from 'vscode-languageserver';
import { TelemetryServiceImplementation } from '../../services/telemetry';
import { sendExceptionTelemetry, TelemetryEventName, TelemetryEvent, eventNamePrefix } from '../../common/telemetry';

test('telemetrySendException', () => {
    const mockedConnection = mock<IConnection>();
    const mockedTelemetry = mock<Telemetry>();
    const telemetry = instance(mockedTelemetry);

    when(mockedConnection.telemetry).thenReturn(telemetry);
    const connection = instance(mockedConnection);

    const ts = new TelemetryServiceImplementation(connection);
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
