import { WorkspaceEdit } from 'vscode-languageserver-types';

export interface CommandResult {
    data?: any;
    edits: WorkspaceEdit;
}

export namespace CommandResult {
    export function is(value: any): value is CommandResult {
        return (value as CommandResult).edits !== undefined;
    }
}
