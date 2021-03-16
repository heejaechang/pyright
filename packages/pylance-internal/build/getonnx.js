#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */

// Allow skipping of this script; useful when needing to run npm install
// without package-lock existing (which this script depends on).
if (process.env.SKIP_GET_ONNX) {
    process.exit(0);
}

// Downloads ONNX runtime from all platforms since npm
// only brings down bits specific to the current machine OS.
// We need all platforms packages into the bundle.

const fs = require('fs');
const https = require('https');
const path = require('path');
const tar = require('tar');
const tmp = require('tmp');

// https://onnxruntimetestdata.blob.core.windows.net/onnxruntime-node-prebuild/onnxruntime-v0.0.1-dev.20200506.1-napi-v3-darwin-x64.tar.gz
// https://onnxruntimetestdata.blob.core.windows.net/onnxruntime-node-prebuild/onnxruntime-v0.0.1-dev.20200506.1-napi-v3-linux-x64.tar.gz
// https://onnxruntimetestdata.blob.core.windows.net/onnxruntime-node-prebuild/onnxruntime-v0.0.1-dev.20200506.1-napi-v3-win32-x64.tar.gz

const baseUrl = 'https://onnxruntimetestdata.blob.core.windows.net/onnxruntime-node-prebuild';
const basePackageName = 'onnxruntime';
const platforms = ['win32', 'darwin', 'linux'];
const tmpFolderName = 'onnxruntime';

const packageJsonPath = path.resolve(path.join(__dirname, '..', 'package-lock.json'));
const packageJsonString = fs.readFileSync(packageJsonPath, { encoding: 'utf8' });
const packageJson = JSON.parse(packageJsonString);
let version = packageJson.dependencies[basePackageName].version;
console.log(`ONNX runtime version: ${version}`);
version = `v${version}`;

class Deferred {
    constructor() {
        this._promise = new Promise((resolve, reject) => {
            this._resolve = resolve;
            this._reject = reject;
        });
    }
    resolve(value) {
        this._resolve(value);
    }
    reject(reason) {
        this._reject(reason);
    }
    get promise() {
        return this._promise;
    }
}

async function downloadOnnxZip(url, zipFileName) {
    const userTmpFolder = path.dirname(tmp.dirSync().name);
    const downloadFolder = path.join(userTmpFolder, tmpFolderName);

    if (!fs.existsSync(downloadFolder)) {
        fs.mkdirSync(downloadFolder);
    }

    const filePath = path.join(downloadFolder, zipFileName);
    if (fs.existsSync(filePath)) {
        return filePath;
    }

    const d = new Deferred();
    const ws = fs.createWriteStream(filePath);
    https
        .get(url, (response) => {
            response.pipe(ws);
            ws.on('finish', () => {
                ws.close();
            }).on('close', () => {
                d.resolve(filePath);
            });
        })
        .on('error', (e) => {
            d.reject(e);
        });

    return d.promise;
}

platforms.forEach(async (platform) => {
    const zipFileName = `${basePackageName}-${version}-napi-v3-${platform}-x64.tar.gz`;
    const url = `${baseUrl}/${zipFileName}`;
    let archiveFilePath;
    try {
        archiveFilePath = await downloadOnnxZip(url, zipFileName);
    } catch (e) {
        console.error(`Exception downloading ONNX module ${zipFileName}: ${e.stack}`);
        process.exit(1);
    }

    let upackPath;
    try {
        const upackPath = require('./findonnx');
        if (!fs.existsSync(upackPath)) {
            fs.mkdirSync(upackPath);
        }

        tar.x({
            file: archiveFilePath,
            cwd: upackPath,
            sync: true,
        });
    } catch (e) {
        console.error(`Exception unpacking ONNX module ${archiveFilePath} to ${upackPath}: ${e.stack}`);
        process.exit(1);
    }
});
