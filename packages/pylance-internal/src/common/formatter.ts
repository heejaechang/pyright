// Removes blank lines and returns an array of code lines
export function formatCode(code: string): string[] {
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

// Returns array of code lines
export function splitCodeLines(code: string): string[] {
    const lines = code.split(/\r?\n/);
    if (!lines || lines.length === 0) {
        return [];
    }

    return lines;
}
