if (process.env.NODE_ENV === 'production') {
    // Silence Buffer deprecations from onnx.
    (process as any).noDeprecation = true;
}

import { main } from 'pylance-internal/server';

main();
