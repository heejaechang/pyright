/*
 * telemetry.ts
 *
 * Telemetry service implemtation.
 */

import { TelemetryService, TelemetryEvent } from '../common/telemetry';
import { IConnection } from 'vscode-languageserver';
import { assert } from 'console';

export class TelemetryServiceImplementation implements TelemetryService {
    private _connection: IConnection;

    constructor(connection: any) {
        assert(connection);
        this._connection = <IConnection>connection;
        assert(this._connection);
    }

    sendTelemetry(event: TelemetryEvent): void {
        this._connection?.telemetry.logEvent(event);
    }
}
