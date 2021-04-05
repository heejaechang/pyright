/*
 * zip.ts
 *
 * Zip archive interfaces.
 */

import { async } from 'node-stream-zip';

export interface ZipOpener {
    open(zipPath: string): ZipFile;
}

export interface ZipFile {
    entryData(entry: string): Promise<Buffer>;
    close(): Promise<void>;
}

export function realZipOpener(): ZipOpener {
    return {
        open: (zipPath) => new async({ file: zipPath }),
    };
}
