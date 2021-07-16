// This is run in a web worker, which eats the errors.
// Try/catch here to provide a better log message and a place to breakpoint.
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const browserMain: typeof import('pylance-internal/browserMain') = require('pylance-internal/browserMain');

    browserMain.main();
} catch (e: any) {
    console.error(e?.message);
    console.error(e?.stack);
    throw e;
}
