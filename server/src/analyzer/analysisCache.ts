/*
* analysisCache.ts
* Copyright (c) Microsoft Corporation.
* Licensed under the MIT license.
* Author: Eric Traut
*
* Maintains a cache of analysis output (symbols, declarations, etc.) for
* source files, eliminating the need to continually reanalyze each time
* the type checker is launched.
*
* Cache files are stored in the system's tmp directory.
*
* Files within the cache correspond to individual python source files.
* The name of the cache file encodes the source file path, the cache
* version, and the options used to analyze the file.
*/

import * as fs from 'fs';

import { ConsoleInterface } from '../common/console';
import { combinePaths, getFileExtension, getFileName, getFileSystemEntries,
    stripFileExtension } from '../common/pathUtils';
import { StringUtils } from '../common/stringUtils';
import { AnalysisCacheDoc, currentCacheDocVersion } from './analysisCacheDoc';

// TODO - need to figure out the right way to do this on Windows
const _tempDir = '/tmp/';
const _cacheDirPrefix = 'pyright-';
const _maxSourceFileName = 32;

interface CacheFileInfo {
    filePath: string;

    // Information encoded in the file name
    pathHash: number;
    optionsHash: number;
    cacheVersion: number;
}

export class AnalysisCache {
    private _console: ConsoleInterface;
    private _cacheDirPath: string;

    constructor(console: ConsoleInterface) {
        this._console = console;

        this._findOrCreateCacheDir();
        if (this._cacheDirPath) {
            this._cleanCache();
        }
    }

    // Deletes all files from the cache.
    clearCache() {
        if (this._cacheDirPath) {
            try {
                const cacheEntries = getFileSystemEntries(this._cacheDirPath);
                cacheEntries.files.forEach(filePath => {
                    this._deleteCacheFile(filePath);
                });
            } catch (e) {
                this._console.error('Failed to delete cache entries');
            }
        }
    }

    writeCacheEntry(sourceFilePath: string, optionsStr: string, cacheDoc: AnalysisCacheDoc) {
        const cacheFileName = combinePaths(this._cacheDirPath,
            this._createCacheFileName(sourceFilePath, optionsStr));
        try {
            fs.writeFileSync(cacheFileName, JSON.stringify(cacheDoc, undefined, 2), { encoding: 'utf8' });
        } catch (e) {
            this._console.error('Could not write cache file for ' + sourceFilePath);
        }
    }

    readCacheEntry(sourceFilePath: string, optionsStr: string): AnalysisCacheDoc | undefined {
        const cacheFileName = combinePaths(this._cacheDirPath,
            this._createCacheFileName(sourceFilePath, optionsStr));

        if (!fs.existsSync(cacheFileName)) {
            return undefined;
        }

        let cacheDocStr: string;

        try {
            cacheDocStr = fs.readFileSync(cacheFileName, { encoding: 'utf8' });
        } catch (e) {
            this._console.error('Could not read cache file for ' + sourceFilePath);
            return undefined;
        }

        try {
            return JSON.parse(cacheDocStr);
        } catch (e) {
            this._console.error('Could not parse cache file for ' + sourceFilePath);
            return undefined;
        }
    }

    private _findOrCreateCacheDir() {
        try {
            // Create a new unique temporary directory.
            const tempDirContents = getFileSystemEntries(_tempDir);

            // Determine if there's an existing temporary directory
            // with the correct prefix.
            const existingCacheDir = tempDirContents.directories.find(dir => {
                const folderName = getFileName(dir);
                return folderName.startsWith(_cacheDirPrefix);
            });

            // If we found an existing temp directory, delete the newly-
            // created one and stick with the old one.
            let cacheDir: string;
            if (existingCacheDir) {
                cacheDir = _tempDir + existingCacheDir;
                this._console.log('Found existing cache directory ' + cacheDir);
            } else {
                cacheDir = fs.mkdtempSync(_tempDir + _cacheDirPrefix);
                fs.mkdirSync(cacheDir);
                this._console.log('Created new cache directory ' + cacheDir);
            }

            this._cacheDirPath = cacheDir;
        } catch (e) {
            this._console.error('Failed to create cache directory');
            this._cacheDirPath = '';
        }
    }

    // Enumerates the files within the cache directory, removing
    // any files that are obsolete or corrupt.
    private _cleanCache() {
        try {
            const cacheEntries = getFileSystemEntries(this._cacheDirPath);
            cacheEntries.files.forEach(filePath => {
                const fileInfo = this._getCacheFileInfo(filePath);
                if (!fileInfo) {
                    this._deleteCacheFile(filePath);
                }
            });
        } catch (e) {
            this._console.error('Failed to enumerate cache entries');
        }
    }

    private _deleteCacheFile(filePath: string) {
        try {
            fs.rmdirSync(filePath);
        } catch (e) {
            this._console.error('Could not delete cache file ' + filePath);
        }
    }

    // Parses the file path into its constituent pieces. Returns
    // undefined if the file name is invalid or the cache version is
    // too old or new.
    private _getCacheFileInfo(filePath: string): CacheFileInfo | undefined {
        let cacheFileName = getFileName(filePath);
        const fileExtension = getFileExtension(cacheFileName);
        cacheFileName = stripFileExtension(cacheFileName);

        if (fileExtension !== '.json') {
            return undefined;
        }

        // Parse the file name. It should be of the form:
        // XXXXXXXX-YYYYYYYY-vvvv-ffffffff.json
        //   XXXXXXXX is the hash of the path (8 characters in hex)
        //   YYYYYYYY is the hash of the options (8 characters in hex)
        //   vvvv is the cache version (4 characters in decimal)
        //   ffffffff is the name of the source file (variable-sized
        //      but truncated to 32 characters)

        try {
            const pathHash = this._decode8CharHex(cacheFileName.substr(0, 8));
            if (cacheFileName.charAt(8) !== '-') {
                return undefined;
            }

            const optionsHash = this._decode8CharHex(cacheFileName.substr(9, 8));
            if (cacheFileName.charAt(17) !== '-') {
                return undefined;
            }

            const cacheVersion = this._decode4CharDec(cacheFileName.substr(18, 4));
            if (cacheFileName.charAt(22) !== '-') {
                return undefined;
            }

            // If the cache version is incorrect, the file is invalid.
            if (cacheVersion !== currentCacheDocVersion) {
                return undefined;
            }

            return {
                filePath,
                pathHash,
                optionsHash,
                cacheVersion
            };
        } catch (e) {
            return undefined;
        }
    }

    private _decode8CharHex(str: string) {
        if (str.length !== 8) {
            throw new Error('Incorrect hex string length');
        }

        return parseInt(str, 16);
    }

    private _encode8CharHex(val: number) {
        let str = val.toString(16);
        if (str.length < 8) {
            // Prepend enough zeros to make it 8 characters long.
            str = '00000000'.substr(0, 8 - str.length) + str;
        }
        return str;
    }

    private _decode4CharDec(str: string) {
        if (str.length !== 4) {
            throw new Error('Incorrect decimal string length');
        }

        return parseInt(str, 10);
    }

    private _encode4CharDecimal(val: number) {
        let str = val.toString(10);
        if (str.length < 4) {
            // Prepend enough zeros to make it 4 characters long.
            str = '0000'.substr(0, 4 - str.length) + str;
        }
        return str;
    }

    private _createCacheFileName(sourceFilePath: string, optionsStr: string) {
        const pathHash = StringUtils.hashString(sourceFilePath);
        const optionsHash = StringUtils.hashString(optionsStr);
        let sourceFileName = stripFileExtension(getFileName(sourceFilePath));
        if (sourceFileName.length > _maxSourceFileName) {
            sourceFileName = sourceFileName.substr(0, _maxSourceFileName);
        }

        return this._encode8CharHex(pathHash) + '-' +
            this._encode8CharHex(optionsHash) + '-' +
            this._encode4CharDecimal(currentCacheDocVersion) + '-' +
            sourceFileName + '.json';
    }
}
