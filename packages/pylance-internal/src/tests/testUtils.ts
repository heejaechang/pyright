import * as fs from 'fs';
import * as path from 'path';

export function resolveTestDataFilePath(fileName: string): string {
    return path.resolve(path.dirname(module.filename), `./data/${fileName}`);
}

export function readTestDataFile(fileName: string): string {
    const filePath = resolveTestDataFilePath(fileName);

    try {
        return fs.readFileSync(filePath, { encoding: 'utf8' });
    } catch {
        console.error(`Could not read file "${fileName}"`);
        return '';
    }
}
