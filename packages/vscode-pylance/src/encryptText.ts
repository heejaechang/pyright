// This script encodes a list of strings for use with the decrypt function in server.ts.
// Run this with "npx ts-node ./src/encryptText.ts".

import * as crypto from 'crypto';

import { licenseErrorText } from './common/license';

const algorithm = 'aes-192-cbc';
const seeLicense = 'SEE  LICENSE.txt';
const key = crypto.scryptSync(licenseErrorText, seeLicense, 24);
const iv = Buffer.from(seeLicense);

function encrypt(s: string): string {
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(s, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
}

const toEncode = [
    'ELECTRON_RUN_AS_NODE',
    'VSCODE_NLS_CONFIG',
    '--stdio',
    '--pipe',
    '--socket',
    '--clientProcessId',
    '--node-ipc',
];

console.log('const enum Encrypted {');

toEncode.forEach((s) => {
    console.log(`    '${s}' = '${encrypt(s)}',`);
});

console.log('}');
