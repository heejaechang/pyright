import { FileSystemEntries } from "../../common/pathUtils";

export interface IO {
    newLine(): string;
    getCurrentDirectory(): string;
    useCaseSensitiveFileNames(): boolean;
    resolvePath(path: string): string | undefined;
    getFileSize(path: string): number;
    readFile(path: string): string | undefined;
    writeFile(path: string, contents: string): void;
    directoryName(path: string): string | undefined;
    getDirectories(path: string): string[];
    createDirectory(path: string): void;
    fileExists(fileName: string): boolean;
    directoryExists(path: string): boolean;
    deleteFile(fileName: string): void;
    // enumerateTestFiles(runner: RunnerBase): (string | IFileBasedTest)[];
    listFiles(path: string, filter?: RegExp, options?: {
        recursive?: boolean;
    }): string[];
    log(text: string): void;
    args(): string[];
    getExecutingFilePath(): string;
    getWorkspaceRoot(): string;
    exit(exitCode?: number): void;
    readDirectory(path: string, extension?: readonly string[],
        exclude?: readonly string[], include?: readonly string[], depth?: number): readonly string[];
    getAccessibleFileSystemEntries(dirname: string): FileSystemEntries;
    tryEnableSourceMapsForHost?(): void;
    getEnvironmentVariable?(name: string): string;
    getMemoryUsage?(): number | undefined;
}

export function bufferFrom(input: string, encoding?: BufferEncoding): Buffer {
    // See https://github.com/Microsoft/TypeScript/issues/25652
    return Buffer.from && (Buffer.from as Function) !== Int8Array.from
        ? Buffer.from(input, encoding) : new Buffer(input, encoding);
}