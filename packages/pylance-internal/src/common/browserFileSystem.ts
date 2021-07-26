import type { Dirent, ReadStream, WriteStream } from 'fs';

import { getOrAdd } from 'pyright-internal/common/collectionUtils';
import {
    FileSystem,
    FileWatcher,
    FileWatcherEventHandler,
    MkDirOptions,
    nullFileWatcherProvider,
    Stats,
    TmpfileOptions,
    VirtualDirent,
} from 'pyright-internal/common/fileSystem';
import {
    combinePaths,
    ensureTrailingDirectorySeparator,
    extractPathFromUri,
    getDirectoryPath,
    getFileName,
    getPathComponents,
    getRelativePath,
    normalizeSlashes,
} from 'pyright-internal/common/pathUtils';

declare let XMLHttpRequest: {
    new (): typeof XMLHttpRequest;
    open(method: string, url: string, async: boolean): void;
    send(): void;
    status: number;
    responseText: string;
};

export function normalizeWebSlashes(relativeWebPath: string) {
    const separatorRegExp = /[\\/]/g;
    return relativeWebPath.replace(separatorRegExp, '/');
}

const dotSlash = normalizeSlashes('./');

export class BrowserFileSystem implements FileSystem {
    private readonly _root: string;
    private _baseUri: string;
    private _baseUriPath: string;

    private readonly _map: Map<string, Entry>;
    private readonly _cache: Map<string, Dirent[]> = new Map<string, Dirent[]>();

    constructor(root: string, baseUri: string) {
        this._root = normalizeSlashes(root);

        const uriPath = extractPathFromUri(baseUri);
        this._baseUri = normalizeWebSlashes(baseUri.substr(0, baseUri.length - uriPath.length));
        this._baseUriPath = normalizeSlashes(ensureTrailingDirectorySeparator(uriPath));

        const folderIndexContent = this._getText(`folderIndex.json`);
        this._map = this._createFolderMap(folderIndexContent);
    }

    existsSync(path: string): boolean {
        const entry = this._getEntry(path);
        return !!entry;
    }

    readdirEntriesSync(path: string): Dirent[] {
        const entry = this._getEntry(path);
        if (!entry || !entry.children) {
            return [];
        }

        const map = entry.children;
        return getOrAdd(this._cache, path, () =>
            [...map.values()].map((e) => new VirtualDirent(e.name, /* file */ !e.children))
        );
    }

    readdirSync(path: string): string[] {
        const entry = this._getEntry(path);
        if (!entry || !entry.children) {
            return [];
        }

        return [...entry.children.keys()];
    }

    readFileSync(path: string, encoding?: null): Buffer;
    readFileSync(path: string, encoding: BufferEncoding): string;
    readFileSync(path: string, encoding?: BufferEncoding | null): string | Buffer;
    readFileSync(path: any, encoding?: any): string | Buffer {
        const relativePath = this._getRelativePath(path);
        if (!relativePath) {
            return '';
        }

        return this._getText(relativePath) ?? '';
    }

    statSync(path: string): Stats {
        const entry = this._getEntry(path);
        if (!entry) {
            throw new Error(`${path} doesn't exist`);
        }

        const file = !entry.children;

        return {
            size: 1, // For now, we don't care actual file size. and it can only access ones we bundled.
            isFile: () => file,
            isDirectory: () => !file,
            isBlockDevice: () => false,
            isCharacterDevice: () => false,
            isSymbolicLink: () => false,
            isFIFO: () => false,
            isSocket: () => false,
        };
    }

    realpathSync(path: string): string {
        return path;
    }

    getModulePath(): string {
        return this._root;
    }

    createFileSystemWatcher(paths: string[], listener: FileWatcherEventHandler): FileWatcher {
        return nullFileWatcherProvider.createFileWatcher(paths, listener);
    }

    realCasePath(path: string): string {
        return path;
    }

    isMappedFilePath(filepath: string): boolean {
        // stdLib file is mapped. We need to use http locations for them
        // which is different than file path we use internally.
        return !!this._getEntry(filepath);
    }

    getOriginalFilePath(mappedFilePath: string) {
        if (this.isMappedFilePath(mappedFilePath)) {
            const relativePath = this._getRelativePath(mappedFilePath);
            if (!relativePath) {
                return mappedFilePath;
            }

            return combinePaths(this._baseUriPath, relativePath);
        }

        return mappedFilePath;
    }

    getMappedFilePath(originalFilepath: string) {
        if (originalFilepath.startsWith(this._baseUriPath)) {
            return combinePaths('/', originalFilepath.substr(this._baseUriPath.length));
        }

        return originalFilepath;
    }

    getUri(path: string): string {
        const mappedFile = this.getMappedFilePath(path);
        const entry = this._getEntry(mappedFile);
        if (entry) {
            const relativePath = this._getRelativePath(mappedFile);
            if (!relativePath) {
                return `memfs:${normalizeWebSlashes(mappedFile)}`;
            }

            return this._createBundledFileUri(relativePath);
        }

        return `memfs:${normalizeWebSlashes(path)}`;
    }

    chdir(path: string): void {
        // don't do anything
    }

    writeFileSync(path: string, data: string | Buffer, encoding: BufferEncoding | null): void {
        // don't do anything
    }

    unlinkSync(path: string): void {
        // don't do anything
    }

    copyFileSync(src: string, dst: string): void {
        // don't do anything
    }

    mkdirSync(path: string, options?: MkDirOptions): void {
        // don't do anything
    }

    createReadStream(path: string): ReadStream {
        throw new Error('Method not supported');
    }

    createWriteStream(path: string): WriteStream {
        throw new Error('Method not supported');
    }

    readFile(path: string): Promise<Buffer> {
        throw new Error('Method not supported');
    }

    readFileText(path: string, encoding?: BufferEncoding): Promise<string> {
        throw new Error('Method not supported');
    }

    tmpdir(): string {
        throw new Error('Method not supported');
    }

    tmpfile(options?: TmpfileOptions): string {
        throw new Error('Method not supported');
    }

    private _getText(relativeWebPath: string) {
        const url = this._createBundledFileUri(relativeWebPath);

        const request = new XMLHttpRequest();
        request.open('GET', url, /* async */ false);
        request.send();
        return request.status === 200 ? request.responseText : undefined;
    }

    private _createBundledFileUri(relativeWebPath: string) {
        const normalized = normalizeWebSlashes(relativeWebPath);
        const url = `${this._baseUri}${normalizeWebSlashes(this._baseUriPath)}${normalized}`;
        return url;
    }

    private _getRelativePath(path: string) {
        // we only supports utf8
        let relativePath = getRelativePath(path, this._root);
        if (!relativePath) {
            return undefined;
        }

        if (relativePath.startsWith(dotSlash)) {
            relativePath = relativePath.substr(2);
        }

        return relativePath;
    }

    private _createFolderMap(folderIndexContent: string | undefined): Map<string, Entry> {
        const map = new Map<string, Entry>();
        if (!folderIndexContent) {
            return map;
        }

        const folderIndex: { files: string[] } = JSON.parse(folderIndexContent);

        for (const file of folderIndex.files) {
            const fullPath = combinePaths(this._root, normalizeSlashes(file));
            const directory = getDirectoryPath(fullPath);

            const parts = getPathComponents(directory);
            let current = map;

            // Skip the first part which points to the root. (ex, / or c:\)
            for (let i = 1; i < parts.length; i++) {
                const entry = getOrAdd(current, parts[i], () => ({
                    name: parts[i],
                    children: new Map<string, Entry>(),
                }));

                current = entry.children!;
            }

            const fileName = getFileName(fullPath);
            current.set(fileName, { name: fileName, children: undefined });
        }

        return map;
    }

    private _getEntry(path: string): Entry | undefined {
        const parts = getPathComponents(path);
        let current = this._map;
        let entry: Entry | undefined = {
            name: '',
            children: current,
        };

        // Skip the first part which points to the root. (ex, / or c:\)
        for (let i = 1; i < parts.length; i++) {
            entry = current.get(parts[i]);
            if (!entry) {
                return undefined;
            }

            if (i === parts.length - 1 && !entry.children) {
                // Last element is a file.
                return entry;
            }

            current = entry.children!;
        }

        return entry;
    }
}

type Entry = {
    name: string;
    children: Map<string, Entry> | undefined;
};
