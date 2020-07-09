/**
 * webpack.config.js
 * Copyright: Microsoft Corporation
 *
 * Configuration for webpack to bundle the javascript into a single file
 * for the IntelliCode utility that performans analysis of Python repo.
 */

/* eslint-disable @typescript-eslint/no-var-requires */
//@ts-check

const path = require('path');
const webpack = require('webpack');

/**@type {import('webpack').Configuration}*/
module.exports = {
    context: path.resolve(__dirname),
    entry: './src/pythia.ts',
    // mode: 'production',
    mode: 'development',
    devtool: 'source-map',
    target: 'node',
    output: {
        filename: 'pythia.js',
        path: path.resolve(__dirname, './dist'),
    },
    optimization: {
        usedExports: true,
    },
    resolve: {
        modules: [path.resolve(__dirname, '.'), 'node_modules'],
        extensions: ['.js', '.ts'],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                loader: 'ts-loader',
                options: {
                    configFile: 'tsconfig.json',
                },
            },
            {
                test: /\.node$/,
                use: 'node-loader',
            },
        ],
    },
};
