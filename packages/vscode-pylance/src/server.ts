if (process.env.NODE_ENV === 'production') {
    // Silence Buffer deprecations from onnx.
    (process as any).noDeprecation = true;
}

import * as crypto from 'crypto';
import { isMainThread } from 'worker_threads';

import { licenseErrorText } from './common/license';

// Keep in sync with encryptText.ts.
const algorithm = 'aes-192-cbc';
const seeLicense = 'SEE  LICENSE.txt';
const key = crypto.scryptSync(licenseErrorText, seeLicense, 24);
const iv = Buffer.from(seeLicense);

function decrypt(s: Encrypted): string {
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(s, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

const enum Encrypted {
    'ELECTRON_RUN_AS_NODE' = '4ef2a28c6e535c3d95e7d9071e8340b4b316eeedd69f2eff8efa3b394dd1f090',
    'VSCODE_NLS_CONFIG' = '697264da7eb9a44dc414d05bbf96075c26086e5c8f779aecc8625bf9924f6a72',
    '--stdio' = 'a9030c13c3ccb221b038c0fabdbf7eef',
    '--pipe' = 'fb9285f4e9a13e36684ad61a2e316e81',
    '--socket' = 'e9667e9886a774db19b5cb7e0b6be692',
    '--clientProcessId' = '1a3d71d8003b1f94bca201d22f695d7b8a7d9b7be61daed5530bd2d12ee03436',
    '--node-ipc' = '782cd91f1d1aaa09bdecc44ba7ab5078',
}

function isInVSCode(): boolean {
    // These environment variables are always set in VS Code.
    for (const name of [decrypt(Encrypted['ELECTRON_RUN_AS_NODE']), decrypt(Encrypted['VSCODE_NLS_CONFIG'])]) {
        if (!process.env[name]) {
            return false;
        }
    }

    for (const arg of process.argv) {
        // These flags are used to tell the LSP server library which transport to use.
        // Pylance runs as IPC, so reject any of the others.
        if (
            arg.startsWith(decrypt(Encrypted['--stdio'])) ||
            arg.startsWith(decrypt(Encrypted['--pipe'])) ||
            arg.startsWith(decrypt(Encrypted['--socket']))
        ) {
            return false;
        }
    }

    if (isMainThread) {
        // The vscode-languageclient sets clientProcessId; require it.
        if (!process.argv.some((arg) => arg.startsWith(decrypt(Encrypted['--clientProcessId'])))) {
            return false;
        }

        // The Python extension client uses the IPC transport; require it.
        if (!process.argv.some((arg) => arg.startsWith(decrypt(Encrypted['--node-ipc'])))) {
            return false;
        }
    }

    return true;
}

if (!isInVSCode()) {
    process.stderr.write(licenseErrorText + '\n');
    process.exit(1);
}

import { main } from 'pylance-internal/server';

main();
