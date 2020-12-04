import { ParseNode, ParseNodeType } from 'pyright-internal/parser/parseNodes';

// Reformats indentation of a code string and returns an array of code lines
export function formatCode(code: string, node: ParseNode | undefined): string[] {
    const newCodeLines: string[] = [];
    const lines = code.split(/\r?\n/);
    if (!lines || lines.length === 0) {
        return newCodeLines;
    }

    for (const line of lines) {
        if (line.trim().length > 0) {
            newCodeLines.push(line);
        }
    }

    return newCodeLines;
}
