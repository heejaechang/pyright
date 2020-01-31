/*
 * io.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 */

import * as pathModule from "path";
import * as os from "os";

import { compareStringsCaseSensitive, compareStringsCaseInsensitive } from "../../common/stringUtils";
import { directoryExists, FileSystemEntries, combinePaths, fileExists, getFileSize, resolvePaths } from "../../common/pathUtils";
import { createFromRealFileSystem } from '../../common/vfs';
import { NullConsole } from '../../common/console';

export const IO: IO = createNodeIO();

// eslint-disable-next-line @typescript-eslint/interface-name-prefix
export interface IO {
    useCaseSensitiveFileNames(): boolean;
    getAccessibleFileSystemEntries(dirname: string): FileSystemEntries;
    directoryExists(path: string): boolean;
    fileExists(fileName: string): boolean;
    getFileSize(path: string): number;
    readFile(path: string): string | undefined;
    getWorkspaceRoot(): string;

    writeFile(path: string, contents: string): void;
    listFiles(path: string, filter?: RegExp, options?: {
        recursive?: boolean;
    }): string[];
    log(text: string): void;
}

function createNodeIO(): IO {
    // NodeJS detects "\uFEFF" at the start of the string and *replaces* it with the actual
    // byte order mark from the specified encoding. Using any other byte order mark does
    // not actually work.
    const byteOrderMarkIndicator = "\uFEFF";
    const vfs = createFromRealFileSystem(new NullConsole());

    const useCaseSensitiveFileNames = isFileSystemCaseSensitive();

    function isFileSystemCaseSensitive(): boolean {
        // win32\win64 are case insensitive platforms
        const platform = os.platform();
        if (platform === "win32") {
            return false;
        }
        // If this file exists under a different case, we must be case-insensitve.
        return !vfs.existsSync(swapCase(__filename));

        /** Convert all lowercase chars to uppercase, and vice-versa */
        function swapCase(s: string): string {
            return s.replace(/\w/g, (ch) => {
                const up = ch.toUpperCase();
                return ch === up ? ch.toLowerCase() : up;
            });
        }
    }

    function listFiles(path: string, spec: RegExp, options: { recursive?: boolean } = {}) {
        function filesInFolder(folder: string): string[] {
            let paths: string[] = [];

            for (const file of vfs.readdirSync(folder)) {
                const pathToFile = pathModule.join(folder, file);
                const stat = vfs.statSync(pathToFile);
                if (options.recursive && stat.isDirectory()) {
                    paths = paths.concat(filesInFolder(pathToFile));
                }
                else if (stat.isFile() && (!spec || file.match(spec))) {
                    paths.push(pathToFile);
                }
            }

            return paths;
        }

        return filesInFolder(path);
    }

    function getAccessibleFileSystemEntries(dirname: string): FileSystemEntries {
        try {
            const entries: string[] = vfs.readdirSync(dirname || ".").sort(useCaseSensitiveFileNames ? compareStringsCaseSensitive : compareStringsCaseInsensitive);
            const files: string[] = [];
            const directories: string[] = [];
            for (const entry of entries) {
                if (entry === "." || entry === "..") continue;
                const name = combinePaths(dirname, entry);
                try {
                    const stat = vfs.statSync(name);
                    if (!stat) continue;
                    if (stat.isFile()) {
                        files.push(entry);
                    }
                    else if (stat.isDirectory()) {
                        directories.push(entry);
                    }
                }
                catch { /*ignore*/ }
            }
            return { files, directories };
        }
        catch (e) {
            return { files: [], directories: [] };
        }
    }

    function readFile(fileName: string, _encoding?: string): string | undefined {
        if (!fileExists(vfs, fileName)) {
            return undefined;
        }
        const buffer = vfs.readFileSync(fileName);
        let len = buffer.length;
        if (len >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
            // Big endian UTF-16 byte order mark detected. Since big endian is not supported by node.js,
            // flip all byte pairs and treat as little endian.
            len &= ~1; // Round down to a multiple of 2
            for (let i = 0; i < len; i += 2) {
                const temp = buffer[i];
                buffer[i] = buffer[i + 1];
                buffer[i + 1] = temp;
            }
            return buffer.toString("utf16le", 2);
        }
        if (len >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
            // Little endian UTF-16 byte order mark detected
            return buffer.toString("utf16le", 2);
        }
        if (len >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
            // UTF-8 byte order mark detected
            return buffer.toString("utf8", 3);
        }
        // Default is UTF-8 with no byte order mark
        return buffer.toString("utf8");
    }

    function writeFile(fileName: string, data: string, writeByteOrderMark?: boolean): void {
        // If a BOM is required, emit one
        if (writeByteOrderMark) {
            data = byteOrderMarkIndicator + data;
        }

        vfs.writeFileSync(fileName, data, "utf8");
    }

    return {
        useCaseSensitiveFileNames: () => useCaseSensitiveFileNames,
        getFileSize: (path: string) => getFileSize(vfs, path),
        readFile: path => readFile(path),
        writeFile: (path, content) => writeFile(path, content),
        fileExists: path => fileExists(vfs, path),
        directoryExists: path => directoryExists(vfs, path),
        listFiles,
        log: s => console.log(s),
        getWorkspaceRoot: () => resolvePaths(__dirname, "../../.."),
        getAccessibleFileSystemEntries,
    };
}

export function bufferFrom(input: string, encoding?: BufferEncoding): Buffer {
    // See https://github.com/Microsoft/TypeScript/issues/25652
    return Buffer.from && (Buffer.from as Function) !== Int8Array.from
        ? Buffer.from(input, encoding) : new Buffer(input, encoding);
}

export const IOErrorMessages = Object.freeze({
    EACCES: "access denied",
    EIO: "an I/O error occurred",
    ENOENT: "no such file or directory",
    EEXIST: "file already exists",
    ELOOP: "too many symbolic links encountered",
    ENOTDIR: "no such directory",
    EISDIR: "path is a directory",
    EBADF: "invalid file descriptor",
    EINVAL: "invalid value",
    ENOTEMPTY: "directory not empty",
    EPERM: "operation not permitted",
    EROFS: "file system is read-only"
});

export function createIOError(code: keyof typeof IOErrorMessages, details = "") {
    const err: NodeJS.ErrnoException = new Error(`${ code }: ${ IOErrorMessages[code] } ${ details }`);
    err.code = code;
    if (Error.captureStackTrace) Error.captureStackTrace(err, createIOError);
    return err;
}
