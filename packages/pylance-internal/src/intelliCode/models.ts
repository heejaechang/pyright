/*
 * models.ts
 *
 * IntelliCode data models.
 */

// How far back IC looks from the point of invocation.
export const LookbackTokenLength = 100;

// Contents of the IC zip file.
export const ModelFileName = 'model.onnx';
export const ModelMetaDataFileName = 'metadata.json';
export const ModelTokensFileName = 'tokens.json';

// Usage data model for offline training
export interface UsageDataModel {
    Repo: string;
    Project: string;
    Document: string;
    References: Map<string, Map<string, TrainingInvocations>>;
}

// Invocation data for offline model training, IsInConditional/IsInLoop are not used for deep learning model training,
// we kept them for backwards compatibility to train the Markov chain model.
export interface TrainingInvocations {
    // NOTE: member name casing is to match IC model JSON.
    spanStart: number[];
    lookbackTokens: string[][];
}

// Invocation data for online inference
export interface EditorInvocation {
    spanStart: number;
    lookbackTokens: string[];
    type: string;
}

export interface PythiaModelMetaData {
    LicenseTerm: string;
    Version: string;
    ModelName: string;
}

export interface PythiaModel {
    model: Uint8Array;
    metaData: PythiaModelMetaData;
    tokenIdMap: Map<string, number>;
    tokens: string[];
}
