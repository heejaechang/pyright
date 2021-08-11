import { CancellationToken } from 'vscode-languageserver';

export interface RequestSender {
    sendRequest<R>(method: string, params: any, token?: CancellationToken): Promise<R>;
}

export interface NotificationSender {
    sendNotification: (method: string, params?: any) => void;
}

// Type-safe LSP wrappers for our custom calls.
export namespace CustomLSP {
    export enum Requests {
        InExperiment = 'python/inExperiment',
        GetExperimentValue = 'python/getExperimentValue',
        IsTrustedWorkspace = 'python/isTrustedWorkspace',
    }

    export enum Notifications {
        BeginProgress = 'python/beginProgress',
        ReportProgress = 'python/reportProgress',
        EndProgress = 'python/endProgress',
        WorkspaceTrusted = 'python/workspaceTrusted',
    }

    interface Params {
        [Requests.InExperiment]: { experimentName: string };
        [Requests.GetExperimentValue]: { experimentName: string };
        [Requests.IsTrustedWorkspace]: undefined;
        [Notifications.BeginProgress]: undefined;
        [Notifications.ReportProgress]: string;
        [Notifications.EndProgress]: undefined;
        [Notifications.WorkspaceTrusted]: { isTrusted: boolean };
    }

    interface Response {
        [Requests.InExperiment]: { inExperiment: boolean };
        [Requests.GetExperimentValue]: { value: any }; // Really "T extends boolean | number | string | undefined", but then Response would need to be generic.
        [Requests.IsTrustedWorkspace]: { isTrusted: boolean };
    }

    export function sendRequest<P extends Params, R extends Response, M extends Requests & keyof P & keyof R & string>(
        connection: RequestSender,
        method: M,
        params: P[M],
        token?: CancellationToken
    ): Promise<R[M]> {
        return connection.sendRequest(method, params, token);
    }

    export function sendNotification<P extends Params, M extends Notifications & keyof P & string>(
        connection: NotificationSender,
        method: M,
        params: P[M]
    ): void {
        connection.sendNotification(method, params);
    }
}
