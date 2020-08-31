/*
 * zip.ts
 *
 * Zip archive unpack.
 */

import * as path from 'path';
import { open } from 'yauzl';

import { createDeferred } from 'pyright-internal/common/deferred';
import { FileSystem } from 'pyright-internal/common/fileSystem';

export interface Zip {
    unzip(archivePath: string, destinationFolder: string): Promise<number>;
}

export function getZip(fs: FileSystem) {
    return new ZipImplementation(fs);
}

class ZipImplementation implements Zip {
    constructor(private _fs: FileSystem) {}

    unzip(archivePath: string, destinationFolder: string): Promise<number> {
        const d = createDeferred<number>();
        const fs = this._fs;
        let count = 0;

        open(archivePath, { lazyEntries: true, autoClose: false }, function (err, zipfile) {
            if (err) {
                d.reject(err);
                return;
            }

            zipfile!.readEntry();
            zipfile!
                .on('entry', function (entry) {
                    if (/\/$/.test(entry.fileName)) {
                        // Directory file names end with '/'.
                        // Note that entries for directories themselves are optional.
                        // An entry's fileName implicitly requires its parent directories to exist.
                        zipfile!.readEntry();
                    } else {
                        // file entry
                        zipfile!.openReadStream(entry, function (err, readStream) {
                            if (err) {
                                d.reject(err);
                                return;
                            }
                            readStream!.on('end', function () {
                                zipfile!.readEntry();
                            });
                            const dst = path.join(destinationFolder, entry.fileName);
                            readStream!.pipe(fs.createWriteStream(dst));
                            count++;
                        });
                    }
                })
                .once('error', function (e: Error) {
                    d.reject(e);
                })
                .once('end', function () {
                    zipfile!.close();
                    d.resolve(count);
                });
        });
        return d.promise;
    }
}
