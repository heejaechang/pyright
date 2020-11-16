import { BlobItem } from '@azure/storage-blob';
import { anything, instance, mock, verify, when } from 'ts-mockito';

import { BlobStorageImpl, DownloadProgress } from '../insiders/blobStorage';

function arrayToAsyncIterable<T>(arr: T[]): AsyncIterable<T> {
    return (async function* () {
        for (const blob of arr) {
            yield blob;
        }
    })();
}

interface TestBlobProxy {
    listBlobs(): AsyncIterable<BlobItem>;
    downloadBlob(blobName: string, dstFileName: string, onProgress?: (p: DownloadProgress) => void): Promise<void>;
}

class TestBlobStorage extends BlobStorageImpl {
    constructor(private testProxy: TestBlobProxy) {
        super();
    }

    protected listBlobs(): AsyncIterable<BlobItem> {
        return this.testProxy.listBlobs();
    }

    protected downloadBlob(
        blobName: string,
        dstFileName: string,
        onProgress?: (p: DownloadProgress) => void
    ): Promise<void> {
        return this.testProxy.downloadBlob(blobName, dstFileName, onProgress);
    }
}

function makeBlobMap(...blobs: [version: string, deleted: boolean][]) {
    const blobMap = Object.fromEntries(
        blobs.map(([version, deleted]) => {
            const blob: BlobItem = {
                name: `vscode-pylance-${version}.vsix`,
                deleted,
                properties: {
                    lastModified: new Date(),
                    etag: '',
                },
                snapshot: '',
            };
            return [version, blob];
        })
    );

    return {
        blobs: Object.values(blobMap),
        blobMap,
    };
}

describe('Blob storage client', () => {
    const { blobs, blobMap } = makeBlobMap(
        ['2020.11.1', true],
        ['2020.11.1-pre.1', false],
        ['2020.11.0', false],
        ['2020.10.2', true],
        ['2020.10.1-pre.2', false],
        ['2020.10.1-pre.1', false],
        ['2020.10.1', false],
        ['2020.10.0', false]
    );

    let blobStorageProxy: TestBlobProxy;
    let blobStorage: TestBlobStorage;

    beforeEach(() => {
        blobStorageProxy = mock();
        blobStorage = new TestBlobStorage(instance(blobStorageProxy));
    });

    test('getLatest no blobs', async () => {
        when(blobStorageProxy.listBlobs()).thenCall(() => arrayToAsyncIterable([]));

        const blobStable = await blobStorage.getLatest(true);
        expect(blobStable).toBeUndefined();

        const blobUnstable = await blobStorage.getLatest(false);
        expect(blobUnstable).toBeUndefined();
    });

    test('getLatest stable', async () => {
        const expectedVersion = '2020.11.0';
        const expectedBlob = blobMap[expectedVersion];

        when(blobStorageProxy.listBlobs()).thenCall(() => arrayToAsyncIterable(blobs));

        const blob = await blobStorage.getLatest(true);
        expect(blob).toBeDefined();

        expect(blob!.version.format()).toBe(expectedVersion);
        expect(blob!.name).toBe(expectedBlob.name);
        expect(blob!.contentLength).toBe(expectedBlob.properties.contentLength);
    });

    test('getLatest unstable', async () => {
        const expectedVersion = '2020.11.1-pre.1';
        const expectedBlob = blobMap[expectedVersion];

        when(blobStorageProxy.listBlobs()).thenCall(() => arrayToAsyncIterable(blobs));

        const blob = await blobStorage.getLatest(false);
        expect(blob).toBeDefined();

        expect(blob!.version.format()).toBe(expectedVersion);
        expect(blob!.name).toBe(expectedBlob.name);
        expect(blob!.contentLength).toBe(expectedBlob.properties.contentLength);
    });

    test('getLatest unstable only', async () => {
        const { blobs, blobMap } = makeBlobMap(
            ['2020.11.1', true],
            ['2020.10.1-pre.2', false],
            ['2020.10.1-pre.1', false]
        );

        const expectedVersion = '2020.10.1-pre.2';
        const expectedBlob = blobMap[expectedVersion];

        when(blobStorageProxy.listBlobs()).thenCall(() => arrayToAsyncIterable(blobs));

        const blob = await blobStorage.getLatest(false);
        expect(blob).toBeDefined();

        expect(blob!.version.format()).toBe(expectedVersion);
        expect(blob!.name).toBe(expectedBlob.name);
        expect(blob!.contentLength).toBe(expectedBlob.properties.contentLength);
    });

    test('download', async () => {
        when(blobStorageProxy.listBlobs()).thenCall(() => arrayToAsyncIterable(blobs));
        when(blobStorageProxy.downloadBlob(anything(), anything(), anything())).thenResolve();

        const blob = await blobStorage.getLatest(true);
        expect(blob).toBeDefined();

        // eslint-disable-next-line @typescript-eslint/no-empty-function
        const onProgress = () => {};
        const dstFileName = 'path/to/some.vsix';

        await blobStorage.download(blob!.name, dstFileName, onProgress);

        verify(blobStorageProxy.downloadBlob(blob!.name, dstFileName, onProgress)).once();
    });
});
