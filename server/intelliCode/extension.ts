/*
 * extension.ts
 *
 * Language service extension implementing IntelliCode.
 */

import { Position } from 'vscode';
import { CompletionList } from 'vscode-languageserver';

import { ConfigOptions } from '../pyright/server/src/common/configOptions';
import { CompletionListExtension, LanguageServiceExtension } from '../pyright/server/src/common/extensibility';
import { ModuleNode } from '../pyright/server/src/parser/parseNodes';
import { LogService } from '../src/common/logger';
import { sendExceptionTelemetry, TelemetryEventName, TelemetryService } from '../src/common/telemetry';

export class IntelliCodeExtension implements LanguageServiceExtension {
    //private _logger: LogService;

    completionListExtension: CompletionListExtension;

    initialize(logger: LogService, telemetry: TelemetryService): void {
        this.completionListExtension = new IntelliCodeCompletionListExtension(telemetry);
        // TODO: this is needed as IC logs suggestions and other info in trace mode.
        // Code that does it in not yet implemented (see expression walker and token
        // generator in Pythia4Python/DeepServing)
        //this._logger = logger;
    }
}

class IntelliCodeCompletionListExtension implements CompletionListExtension {
    constructor(private _telemetry: TelemetryService) {}

    updateCompletionList(
        sourceList: CompletionList,
        ast: ModuleNode,
        position: Position,
        options: ConfigOptions
    ): CompletionList {
        try {
            // TODO: actual IntelliCode is not yet implemented. Still need to port
            // expression walker and token generator - see Pythia4Python/DeepServing.
            return sourceList;
        } catch (e) {
            sendExceptionTelemetry(this._telemetry, TelemetryEventName.EXCEPTION_IC, e);
        }
        return sourceList;
    }
}
