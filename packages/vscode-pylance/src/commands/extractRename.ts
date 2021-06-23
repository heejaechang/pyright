import * as vscode from 'vscode';

import { CommandResult } from 'pyright-internal/commands/commandResult';

import { ExtractCommandData } from 'pylance-internal/commands/extractCommands';

export function renameEdit(extractResult: CommandResult) {
    const textEditor = vscode.window.activeTextEditor;
    if (!textEditor) {
        return;
    }
    const changesMap = extractResult.edits.changes;
    const data = extractResult.data as ExtractCommandData;
    if (changesMap && data) {
        const newWord = data.newSymbolName;
        const uri = textEditor.document.uri.toString();
        const textEdits = changesMap[uri];
        if (!textEdits) {
            const resultUris = Object.keys(changesMap);
            throw new Error(`Unable to match active uri: ${uri} \n in extract results: ${resultUris.join('\n')}`);
        }

        const minStartLine = textEdits.reduce(
            (min, c) => (c.range.start.line < min ? c.range.start.line : min),
            textEdits[0].range.start.line
        );

        let newWordPosition: vscode.Position | undefined;
        for (let lineNumber = minStartLine; lineNumber < textEditor.document.lineCount; lineNumber += 1) {
            const line = textEditor.document.lineAt(lineNumber);
            const indexOfWord = line.text.indexOf(newWord);
            if (indexOfWord >= 0) {
                newWordPosition = new vscode.Position(line.range.start.line, indexOfWord);
                break;
            }
        }

        if (newWordPosition) {
            textEditor.selections = [
                new vscode.Selection(
                    newWordPosition,
                    new vscode.Position(newWordPosition.line, newWordPosition.character + newWord.length)
                ),
            ];
            textEditor.revealRange(
                new vscode.Range(textEditor.selection.start, textEditor.selection.end),
                vscode.TextEditorRevealType.Default
            );
        }

        // Now that we have selected the new variable, lets invoke the rename command
        vscode.commands.executeCommand('editor.action.rename');
    }
}
