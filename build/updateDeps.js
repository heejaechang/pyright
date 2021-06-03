/* eslint-disable @typescript-eslint/no-var-requires */
//@ts-check

const util = require('util');
const yargs = require('yargs');
const exec = util.promisify(require('child_process').exec);

const { updateAll } = require('../packages/pyright/build/lib/updateDeps');

async function main() {
    const argv = yargs.options({
        transitive: { type: 'boolean' },
    }).argv;

    process.env.SKIP_GET_ONNX = 'yes';
    await updateAll(!!argv.transitive, [
        // These packages impact compatibility with VS Code and other users;
        // ensure they remained pinned exactly.
        '@types/vscode',
        'vscode-jsonrpc',
        'vscode-languageclient',
        'vscode-languageserver',
        'vscode-languageserver-protocol',
        'vscode-languageserver-types',
        'onnxruntime',
    ]);
    process.env.SKIP_GET_ONNX = undefined;

    if (argv.transitive) {
        console.log('pylance-internal: re-running npm install for onnxruntime');
        await exec('npm install', { cwd: 'packages/pylance-internal' });
    }
}

main();
