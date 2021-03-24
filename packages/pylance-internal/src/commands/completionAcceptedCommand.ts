import { CancellationToken, Command, ExecuteCommandParams } from 'vscode-languageserver';

import { Commands } from '../commands/commands';
import { TelemetryEvent, TelemetryEventName, TelemetryService } from '../common/telemetry';
import { ServerCommand } from './commandController';

export interface CompletionAcceptedArgs {
    autoImport: boolean;
}

const nonAutoArgs: CompletionAcceptedArgs = {
    autoImport: false,
};

export const nonAutoImportAcceptedCommand: Command = {
    title: '',
    command: Commands.completionAccepted,
    arguments: [nonAutoArgs],
};

const autoArgs: CompletionAcceptedArgs = {
    autoImport: true,
};

export const autoImportAcceptedCommand: Command = {
    title: '',
    command: Commands.completionAccepted,
    arguments: [autoArgs],
};

export class CompletionAcceptedCommand implements ServerCommand {
    constructor(private _telemetry: TelemetryService | undefined) {}

    async execute(cmdParams: ExecuteCommandParams, _token: CancellationToken): Promise<any> {
        if (!this._telemetry || cmdParams.arguments?.length !== 1) {
            return;
        }

        const args: CompletionAcceptedArgs = cmdParams.arguments[0];

        const te = new TelemetryEvent(TelemetryEventName.COMPLETION_ACCEPTED);
        te.Properties['autoImport'] = `${args.autoImport}`;

        this._telemetry.sendTelemetry(te);
    }
}
