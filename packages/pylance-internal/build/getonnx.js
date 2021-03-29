#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */
// @ts-check

// Allow skipping of this script; useful when needing to run npm install
// without package-lock existing (which this script depends on).
if (process.env.SKIP_GET_ONNX) {
    process.exit(0);
}

// Downloads ONNX runtime from all platforms since npm
// only brings down bits specific to the current machine OS.
// We need all platforms packages into the bundle.

const fs = require('fs');
const path = require('path');
const tar = require('tar');
const { default: got } = require('got');
const hasha = require('hasha');

const stream = require('stream');
const { promisify } = require('util');
const pipeline = promisify(stream.pipeline);

const { version, rootDir: outputDir, downloadCacheDir } = require('./findonnx');

/** @type {[platform: string, arch: string][]} */
const platforms = [
    ['win32', 'x64'],
    ['darwin', 'x64'],
    ['linux', 'x64'],
];

/** @type {(platform: string, arch: string) => Promise<void>} */
async function downloadOne(platform, arch) {
    const url = `https://onnxruntimetestdata.blob.core.windows.net/onnxruntime-node-prebuild/onnxruntime-v${version}-napi-v3-${platform}-${arch}.tar.gz`;
    const tarName = path.basename(url);
    const tarPath = path.resolve(downloadCacheDir, tarName);

    /** @type {import('got').Response} */
    let response;

    if (!fs.existsSync(tarPath)) {
        console.log(`Downloading ${url}`);
        const stream = got.get(url, { isStream: true });
        stream.on('response', (r) => {
            response = r;
        });
        await pipeline(stream, fs.createWriteStream(tarPath));
    } else {
        console.log(`Already downloaded ${tarName}; skipping`);
        response = await got.head(url);
    }

    const expectedHashBase64 = response.headers['content-md5'];
    if (typeof expectedHashBase64 !== 'string') {
        throw new Error('unexpected Content-MD5 header value');
    }
    const expectedHash = Buffer.from(expectedHashBase64, 'base64').toString('hex');

    console.log(`Checking hash of ${tarName}`);
    const hash = await hasha.fromFile(tarPath, { algorithm: 'md5' });
    if (hash !== expectedHash) {
        fs.unlinkSync(tarPath);
        throw new Error('hash mismatch');
    }

    console.log(`Extracting ${tarName}`);
    await tar.x({
        file: tarPath,
        cwd: outputDir,
    });
}

async function main() {
    if (!fs.existsSync(downloadCacheDir)) {
        fs.mkdirSync(downloadCacheDir, { recursive: true });
    }

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    for (const [platform, arch] of platforms) {
        let success = false;
        for (let i = 0; !success && i < 3; i++) {
            try {
                await downloadOne(platform, arch);
                success = true;
                break;
            } catch (e) {
                console.error(`Exception occurred, retrying: ${e}`);
            }
        }

        if (!success) {
            console.error('Failed too many times; quitting.');
            process.exit(1);
        }
    }
}

main();
