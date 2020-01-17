/**
 * webpack.config.js
 * Copyright: Microsoft 2019
 *
 * Configuration for webpack to bundle the javascript into a single file
 * for the PyRx language server.
 */

/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');

module.exports = {
    context: path.resolve(__dirname),
    entry: './server.ts',
    mode: 'production',
    target: 'node',
    output: {
        filename: 'server.bundle.js',
        path: path.resolve(__dirname, '../dist')
    },
    optimization: {
        usedExports: true
    },
    resolve: {
        modules: [path.resolve(__dirname, '.'), 'node_modules'],
        extensions: ['.js', '.ts']
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                loader: 'ts-loader',
                options: {
                    configFile: 'tsconfig.json'
                }
            },
            {
                test: /\.node$/,
                use: 'node-loader'
            }
        ]
    },
    node: {
        fs: 'empty',
        __dirname: false,
        __filename: false
    }
};
