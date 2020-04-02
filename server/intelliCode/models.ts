/*
 * models.ts
 *
 * IntelliCode data models.
 */

// Usage data model for offline training
export class UsageDataModel {
    Repo: string;
    Project: string;
    Document: string;
    References: Map<string, Map<string, TrainingInvocations>>;
}

// Invocation data for offline model training, IsInConditional/IsInLoop are not used for deep learning model training,
// we kept them for backwards compatibility to train the Markov chain model.
export class TrainingInvocations {
    // NOTE: member name casing is to match IC model JSON.
    spanStart: number[];
    lookbackTokens: string[][];
}

// Invocation data for online inference
export class EditorInvocation {
    spanStart: number;
    lookbackTokens: string[];
    type: string;
}
