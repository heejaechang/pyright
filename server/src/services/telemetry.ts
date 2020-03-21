/*
 * telemetry.ts
 *
 * Telemetry service implemtation.
 */

import { assert } from 'console';
import { IConnection } from 'vscode-languageserver';

import { TelemetryEvent, TelemetryService } from '../common/telemetry';

export class TelemetryServiceImplementation implements TelemetryService {
    private _connection: IConnection;

    constructor(connection: any) {
        assert(connection);
        this._connection = connection as IConnection;
        assert(this._connection);
    }

    sendTelemetry(event: TelemetryEvent): void {
        this._connection?.telemetry.logEvent(event);
    }
}
