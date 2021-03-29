/* eslint-disable @typescript-eslint/no-var-requires */
// @ts-check

// This script finds the onnxruntime as resolved in pylance-internal.
// This is needed to find the module if it's been hoisted.

const fs = require('fs');
const path = require('path');

const packageJsonPath = path.resolve(__dirname, '..', 'package-lock.json');
const packageJsonString = fs.readFileSync(packageJsonPath, { encoding: 'utf8' });
const packageJson = JSON.parse(packageJsonString);

/** @type {string} */
const version = packageJson.dependencies['onnxruntime'].version;

const rootDir = path.resolve(__dirname, '..', '.onnxruntime');

module.exports.version = version;
module.exports.rootDir = rootDir;
module.exports.binDir = path.resolve(rootDir, 'bin');
module.exports.downloadCacheDir = path.resolve(rootDir, 'downloadCache');
