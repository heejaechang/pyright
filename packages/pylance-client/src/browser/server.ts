// This is run in a web worker, which eats the errors.
// Try/catch here to provide a better log message and a place to breakpoint.
try {
    // Shim process here rather than using webpack as DefinePlugin doesn't
    // always define process even if it's used.
    // TODO: Move to pylance-internal when vscode-pylance needs a server main.
    global.process = require('process/browser');
    process.execArgv = [];
    // TODO: Don't even bother calling this in the browser?
    process.memoryUsage = () => ({ external: 0, heapTotal: 0, heapUsed: 0, rss: 0 });

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const browserMain: typeof import('pylance-internal/browserMain') = require('pylance-internal/browserMain');

    browserMain.main();
} catch (e: any) {
    console.error(e?.message);
    console.error(e?.stack);
    throw e;
}
