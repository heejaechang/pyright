/**
 * webpack.config.js
 * Copyright: Microsoft 2019
 *
 * Configuration for webpack to bundle the javascript into a single file
 * for the PyRx language server.
 */

/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const webpack = require('webpack');
const CopyPlugin = require('copy-webpack-plugin');

const nodeModules = 'node_modules';
const serverFolder = path.resolve(__dirname, '.');
const serverNodeModules = path.join(serverFolder, nodeModules);
const onnxBin = path.join(serverNodeModules, 'onnxruntime', 'bin');
const outputPath = path.resolve(__dirname, path.join(serverFolder, '..', 'dist'));
const onnxOut = path.join(outputPath, 'native', 'onnxruntime');

module.exports = {
    context: serverFolder,
    entry: path.join(serverFolder, 'server.ts'),
    mode: 'production',
    // mode: 'development',
    // devtool: 'source-map',
    target: 'node',
    output: {
        filename: 'server.bundle.js',
        path: outputPath,
    },
    optimization: {
        usedExports: true,
    },
    resolve: {
        modules: [serverFolder, serverNodeModules],
        extensions: ['.js', '.ts', '.node'],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                loader: 'ts-loader',
                options: {
                    configFile: path.join(serverFolder, 'tsconfig.json'),
                },
            },
            {
                // Native node bindings: rewrite 'require' calls.
                // Actual binaries are deployed with CopyPlugin below.
                test: /\.(node)$/,
                loader: 'native-ext-loader',
            },
        ],
    },
    node: {
        fs: 'empty',
        __dirname: false,
        __filename: false,
    },
    plugins: [
        new webpack.EnvironmentPlugin({
            NUGETPACKAGEVERSION: '',
        }),
        new CopyPlugin([{ from: `${onnxBin}`, to: onnxOut }]),
    ],
};
