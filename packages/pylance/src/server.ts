if (process.env.NODE_ENV === 'production') {
    // Silence Buffer deprecations from onnx.
    (process as any).noDeprecation = true;
}

import { VERSION } from 'pylance-internal/common/constants';
import { main } from 'pylance-internal/server';

if (process.argv.some((arg) => arg === '--version')) {
    console.log(`pylance ${VERSION}`);
    process.exit(0);
}

main();
