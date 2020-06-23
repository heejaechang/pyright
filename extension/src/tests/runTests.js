/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const vsct = require('vscode-test');
const extRoot = path.resolve(__dirname, '..', '..');

function start() {
    console.log('*'.repeat(100));
    console.log('Start Pylance extension tests');
    vsct.runTests({
        extensionDevelopmentPath: extRoot,
        extensionTestsPath: path.join(extRoot, 'out', 'tests', 'jest', 'jest-test-runner'),
        launchArgs: ['--disable-extensions'],
        extensionTestsEnv: { ...process.env },
    }).catch((ex) => {
        console.error('End Pylance extension tests (with errors)', ex);
        process.exit(1);
    });
}
start();
