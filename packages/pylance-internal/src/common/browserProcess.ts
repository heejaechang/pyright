// Browser shim for the global process object for use with webpack.

/* eslint-disable @typescript-eslint/no-var-requires */
const browserProcess: NodeJS.Process = require('process/browser');

browserProcess.execArgv = [];
browserProcess.memoryUsage = () => ({ external: 0, heapTotal: 0, heapUsed: 0, rss: 0 });

module.exports = browserProcess;
