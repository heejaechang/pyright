import * as vscode from 'vscode';

import { convertPositionToOffset } from 'pyright-internal/common/positionUtils';
import { Tokenizer } from 'pyright-internal/parser/tokenizer';
import { StringToken, StringTokenFlags, Token, TokenType } from 'pyright-internal/parser/tokenizerTypes';

export function registerAutoClosing() {
    // Check at startup and assume the LS can't change without a reload.
    // If this changes, we will need to check per-change or invalidate this.
    if (!isUsingPylance()) {
        return;
    }

    vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.document.languageId === 'python') {
            e.contentChanges.forEach((c) => handleChange(e.document, c));
        }
    });
}

function handleChange(doc: vscode.TextDocument, event: vscode.TextDocumentContentChangeEvent) {
    const isQuote = event.text === `'` || event.text === `"`;
    if (!isQuote) {
        return;
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.uri.toString() !== doc.uri.toString()) {
        return;
    }

    const endPos = event.range.end;
    const endPlusOne = endPos.translate(0, 1);
    const quotes = event.text[0].repeat(3);

    const prefix = doc.getText(new vscode.Range(endPlusOne.with(undefined, 0), endPlusOne));
    if (!prefix.endsWith(quotes)) {
        // Performance optimization to avoid tokenizing to look for a string if the text
        // before the change isn't actually a triple quote.
        return;
    }

    const docContents = doc.getText();

    // The whole file must be tokenized, as the tokenizer doesn't let us tokenize up to
    // and including the token the cursor is in. Truncating the string early would mean
    // we couldn't check to see if the string had already been terminated.
    //
    // TODO: allow the tokenizer to run up until a certain point, to speed up the case
    // where the user is at the beginning of a large file (as the rest doesn't matter).
    const tokenizer = new Tokenizer();
    const { lines, tokens } = tokenizer.tokenize(docContents);

    const offset = convertPositionToOffset(endPos, lines);
    if (offset === undefined || offset < 0) {
        return;
    }

    const token = tokens.getItemAt(tokens.getItemAtPosition(offset));
    if (!isStringToken(token)) {
        return;
    }

    closeTripleQuote(editor, doc, quotes, token, docContents);

    // TODO: f-string brace closing, auto-"f" insertion.
}

function closeTripleQuote(
    editor: vscode.TextEditor,
    doc: vscode.TextDocument,
    quotes: string,
    token: StringToken,
    docContents: string
) {
    const isTripleQuote = (token.flags & StringTokenFlags.Triplicate) !== 0;
    const isUnterminated = (token.flags & StringTokenFlags.Unterminated) !== 0;
    const isEmpty = /^\s*$/.test(token.escapedValue); // Allow trailing whitespace.

    if (!isTripleQuote || !isEmpty || !isUnterminated) {
        return;
    }

    if (!shouldAutoCloseQuotes(doc.uri, docContents, token)) {
        return;
    }

    insertAfterCursor(editor, quotes);
}

function shouldAutoCloseQuotes(uri: vscode.Uri, docContents: string, token: StringToken): boolean {
    const setting = vscode.workspace.getConfiguration('editor', uri).get<string>('autoClosingQuotes');
    if (setting === 'always' || setting === 'languageDefined') {
        return true;
    }

    if (setting === 'beforeWhitespace') {
        // beforeWhitespace means to only insert a quote if the quote is after whitespace, for example,
        // writing a contraction. For triple quotes, check before the beginning of the quote.
        if (token.start === 0 || /\s/.test(docContents[token.start - 1])) {
            return true;
        }
    }

    return false;
}

function insertAfterCursor(editor: vscode.TextEditor, text: string) {
    const snippet = new vscode.SnippetString();
    snippet.appendPlaceholder('', 0);
    snippet.appendText(text);

    const pos = editor.selection.start.translate(0, 1);
    editor.insertSnippet(snippet, pos);
}

function isStringToken(token: Token): token is StringToken {
    return token.type === TokenType.String;
}

function isUsingPylance(): boolean {
    const setting = vscode.workspace.getConfiguration('python').get<string>('languageServer');
    return setting === 'Default' || setting === 'Pylance';
}
