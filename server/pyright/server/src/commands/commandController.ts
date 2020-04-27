/*
 * commandController.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Implements language server commands execution functionality.
 */

import { CancellationToken, ExecuteCommandParams, ResponseError, TextEdit, WorkspaceEdit } from 'vscode-languageserver';

import { FileEditAction, TextEditAction } from '../common/editAction';
import { convertPathToUri } from '../common/pathUtils';
import { LanguageServerInterface } from '../languageServerBase';
import { Commands } from './commands';
import { CreateTypeStubCommand } from './createTypeStub';
import { QuickActionCommand } from './quickActionCommand';
import { RestartServerCommand } from './restartServer';

export interface ServerCommand {
    execute(cmdParams: ExecuteCommandParams, token: CancellationToken): Promise<any>;
}

export class CommandController implements ServerCommand {
    private _createStub: CreateTypeStubCommand;
    private _restartServer: RestartServerCommand;
    private _quickAction: QuickActionCommand;

    constructor(ls: LanguageServerInterface) {
        this._createStub = new CreateTypeStubCommand(ls);
        this._restartServer = new RestartServerCommand(ls);
        this._quickAction = new QuickActionCommand(ls);
    }

    async execute(cmdParams: ExecuteCommandParams, token: CancellationToken): Promise<any> {
        switch (cmdParams.command) {
            case Commands.orderImports:
            case Commands.addMissingOptionalToParam: {
                return this._quickAction.execute(cmdParams, token);
            }

            case Commands.createTypeStub: {
                return this._createStub.execute(cmdParams, token);
            }

            case Commands.restartServer: {
                return this._restartServer.execute(cmdParams);
            }

            default: {
                return new ResponseError<string>(1, 'Unsupported command');
            }
        }
    }
}

export function convertTextEdits(editActions: TextEditAction[] | undefined) {
    if (!editActions) {
        return [];
    }

    const edits: TextEdit[] = [];
    editActions.forEach((editAction) => {
        edits.push({
            range: editAction.range,
            newText: editAction.replacementText,
        });
    });

    return edits;
}

export function convertWorkspaceEdits(edits: FileEditAction[]) {
    const workspaceEdits: WorkspaceEdit = {
        changes: {},
    };

    edits.forEach((edit) => {
        const uri = convertPathToUri(edit.filePath);
        workspaceEdits.changes![uri] = workspaceEdits.changes![uri] || [];
        workspaceEdits.changes![uri].push({ range: edit.range, newText: edit.replacementText });
    });

    return workspaceEdits;
}
