/*
 * crypto.ts
 * Copyright (c) Microsoft Corporation.
 *
 * Helper functions for crypto.
 */

let nodeCrypto: typeof import('crypto') | undefined;

try {
    nodeCrypto = require('crypto');
    if (!nodeCrypto?.createHash) {
        nodeCrypto = undefined;
    }
} catch {
    // Not running in node.
}

import shajs from 'sha.js';

const createHash = nodeCrypto?.createHash || shajs;

export function sha256(s: string) {
    return createHash('sha256').update(s).digest('hex');
}
