export function main() {
    // This is run in a web worker, which eats the errors.
    // Try/catch here to provide a better log message and a place to breakpoint.
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const browserServer: typeof import('./browserServer') = require('./browserServer');

        browserServer.run();
    } catch (e: any) {
        console.error(e?.message);
        console.error(e?.stack);
        throw e;
    }
}
