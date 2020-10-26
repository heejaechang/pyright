if (process.env.NODE_ENV === 'production') {
    // Silence Buffer deprecations from onnx.
    (process as any).noDeprecation = true;
}

import { licenseErrorText } from './common/license';

function isInVSCode(): boolean {
    for (const name of ['ELECTRON_RUN_AS_NODE', 'VSCODE_NLS_CONFIG']) {
        if (!process.env[name]) {
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
