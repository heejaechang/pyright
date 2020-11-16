import { AnonymousCredential, BlobItem, BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import * as semver from 'semver';

import { getFileExtension, stripFileExtension } from 'pyright-internal/common/pathUtils';

export interface VersionedBlob {
    version: semver.SemVer;
    name: string;
    contentLength?: number;
}

export interface BlobStorage {
    getLatest(stable: boolean): Promise<VersionedBlob | undefined>;
    download(blobName: string, dstFileName: string, onProgress?: (p: DownloadProgress) => void): Promise<void>;
}

export interface DownloadProgress {
    loadedBytes: number;
}

export class BlobStorageImpl implements BlobStorage {
    private _container?: ContainerClient;

    async getLatest(stable: boolean): Promise<VersionedBlob | undefined> {
        let latest: VersionedBlob | undefined;

        const blobs = this.listBlobs();
        for await (const blob of blobs) {
            if (blob.deleted || getFileExtension(blob.name) !== '.vsix') {
                continue;
            }

            const versionStr = stripFileExtension(blob.name).replace(/^vscode-pylance-/, '');
            const version = semver.parse(versionStr);
            if (!version) {
                continue;
            }

            // If searching for stable, only check stable releases.
            // If searching for prereleases, only check prereleases.
            if (stable !== !version.prerelease.length) {
                continue;
            }

            if (!latest || semver.lt(latest.version, version)) {
                latest = {
                    version,
                    name: blob.name,
                    contentLength: blob.properties.contentLength,
                };
            }
        }

        return latest;
    }

    async download(blobName: string, dstFileName: string, onProgress?: (p: DownloadProgress) => void): Promise<void> {
        await this.downloadBlob(blobName, dstFileName, onProgress);
    }

    // Overridable for testing.
    protected listBlobs(): AsyncIterable<BlobItem> {
        return this.container.listBlobsFlat();
    }

    // Overridable for testing.
    protected async downloadBlob(
        blobName: string,
        dstFileName: string,
        onProgress?: (p: DownloadProgress) => void
    ): Promise<void> {
        await this.container.getBlobClient(blobName).downloadToFile(dstFileName, undefined, undefined, { onProgress });
    }

    private get container(): ContainerClient {
        if (!this._container) {
            const serviceClient = new BlobServiceClient(
                `https://pvsc.blob.core.windows.net`,
                new AnonymousCredential()
            );
            this._container = serviceClient.getContainerClient('pylance-insiders');
        }
        return this._container;
    }
}
