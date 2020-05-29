/*
 * modelService.ts
 *
 * Temporary service to fetch baked-in IntelliCode model.
 */

import * as path from 'path';
import { dirSync } from 'tmp';
import https = require('https');

import { createDeferred } from '../pyright/server/src/common/deferred';
import { FileSystem } from '../pyright/server/src/common/fileSystem';
import { ModelZipAcquisitionService, ModelZipFileName } from './models';

// TODO: this class is temporary and will be replaced by the actual
// acquisition service from an npm module provided by the IntelliCode team.
const url = 'https://pvsc.blob.core.windows.net/pyrx-ic-model/model.zip';

export class ModelZipAcquisionServiceImpl implements ModelZipAcquisitionService {
    constructor(private readonly _fs: FileSystem) {}

    // TODO: provide progress reposting facilities.
    async getModel(): Promise<string> {
        const tmpFolder = dirSync();

        const filePath = path.join(tmpFolder.name, ModelZipFileName);
        if (this._fs.existsSync(filePath)) {
            return filePath;
        }

        const fs = this._fs.createWriteStream(filePath);
        const d = createDeferred<string>();

        https
            .get(url, (response) => {
                response.pipe(fs);
                fs.on('finish', () => {
                    fs.close();
                }).on('close', () => {
                    d.resolve(filePath);
                });
            })
            .on('error', (e) => {
                d.reject(e);
            });

        return d.promise;
    }
}
