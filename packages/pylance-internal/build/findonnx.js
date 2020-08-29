/* eslint-disable @typescript-eslint/no-var-requires */

// This script finds the onnxruntime as resolved in pylance-internal.
// This is needed to find the module if it's been hoisted.

const path = require('path');

module.exports = path.resolve(require.resolve('onnxruntime'), '..', '..');
