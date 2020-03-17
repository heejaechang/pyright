/*
 * telemetry.ts
 *
 * Telemetry service implemtation.
 */

import { TelemetryService, TelemetryEvent } from '../common/telemetry';
import { IConnection } from 'vscode-languageserver';

export class TelemetryServiceImplementation implements TelemetryService {
    constructor(private _connection?: IConnection) {}

    sendTelemetry(event: TelemetryEvent): void {
        this._connection?.telemetry.logEvent(event);
    }
}
