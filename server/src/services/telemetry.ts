/*
 * telemetry.ts
 *
 * Telemetry service implemtation.
 */

import { IConnection } from 'vscode-languageserver';
import { TelemetryService, TelemetryEvent } from '../common/telemetry';

export class TelemetryServiceImplementation implements TelemetryService {
    constructor(private _connection?: IConnection) {}

    sendTelemetry(event: TelemetryEvent): void {
        this._connection?.telemetry.logEvent(event);
    }
}
