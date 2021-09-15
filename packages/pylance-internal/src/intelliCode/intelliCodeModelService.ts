/*
 * intelliCodeModelService.ts
 *
 * IntelliCode model service client.
 */

import { createConnection } from 'net';
import * as rpc from 'vscode-jsonrpc/node';

interface IApiTypePatternRes {
    Item1: IApiTypePattern;
    Item2: number;
}

interface IApiTypePattern {
    Model: string;
    InvocationCount: number;
    RecommendationsInIfCondition: string[];
    RecommendationsNotInIfCondition: string[];
}

enum FailureReason {
    /// <summary>
    /// No failure - model lookup did not fail.
    /// </summary>
    None = 0,
    /// <summary>
    /// The requested pattern wasn't found in the model.
    /// </summary>
    NotInModel = 1,
    /// <summary>
    /// <placeholder />
    /// </summary>
    NotInIntersection = 2,
    /// <summary>
    /// The model could not be loaded, or has not been loaded yet.
    /// </summary>
    ModelLoadFailed = 3,
    /// <summary>
    /// <placeholder />
    /// </summary>
    ZeroWeight = 4,
}

interface IDeepLearningModelInferenceResult {
    Model: string;
    Recommendations: string[];
    FailureReason: FailureReason;
}

export const DEEP_RERANK_ANALYZER_NAME = 'intellisense-members-lstm2';

export class IntelliCodeModelService {
    public static get instance(): IntelliCodeModelService {
        if (!IntelliCodeModelService.singleton) {
            IntelliCodeModelService.singleton = new IntelliCodeModelService();
        }
        return IntelliCodeModelService.singleton;
    }

    private static singleton: IntelliCodeModelService;
    private _connection: rpc.MessageConnection | undefined;

    private loadModelRequest = new rpc.RequestType3<string, string, string, string[], void>('LoadModelAsync');

    private getPatternsRequest = new rpc.RequestType3<string, string, string[], IApiTypePatternRes[], void>(
        'GetPatternsAsync'
    );

    private deepLearningModelInferenceRequest = new rpc.RequestType4<
        string,
        string,
        string[],
        string[],
        IDeepLearningModelInferenceResult,
        void
    >('DeepLearningModelInferenceAsync');

    public async startModelServiceAsync(pipeName: string) {
        if (this._connection) {
            return;
        }

        const socket = createConnection(pipeName);

        this._connection = rpc.createMessageConnection(
            new rpc.StreamMessageReader(socket),
            new rpc.StreamMessageWriter(socket)
        );

        this._connection.listen();
    }

    public async loadModelAsync(language: string, analyzerName: string, modelPath: string) {
        return this._connection?.sendRequest(this.loadModelRequest, language, analyzerName, modelPath);
    }

    public async getPatternsAsync(language: string, analyzerName: string, keys: string[]) {
        return this._connection?.sendRequest(this.getPatternsRequest, language, analyzerName, keys);
    }

    public async deepLearningModelInferenceAsync(
        language: string,
        analyzerName: string,
        lookbackTokens: string[],
        candidates: string[]
    ) {
        return this._connection?.sendRequest(
            this.deepLearningModelInferenceRequest,
            language,
            analyzerName,
            lookbackTokens,
            candidates
        );
    }
}
