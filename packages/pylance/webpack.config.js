/**
 * webpack.config-cli.js
 * Copyright: Microsoft 2018
 */

/* eslint-disable @typescript-eslint/no-var-requires */
//@ts-check

const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const { TsconfigPathsPlugin } = require('tsconfig-paths-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

const outPath = path.resolve(__dirname, 'dist');
const packages = path.resolve(__dirname, '..');

const typeshedFallback = path.resolve(packages, 'pyright', 'packages', 'pyright-internal', 'typeshed-fallback');
const bundledStubs = path.resolve(packages, 'pylance-internal', 'bundled-stubs');
const onnxBin = path.join(packages, 'pylance-internal', 'node_modules', 'onnxruntime', 'bin');

/**@type {import('webpack').Configuration}*/
module.exports = {
    context: __dirname,
    entry: {
        'pylance-langserver': './src/langserver.ts',
    },
    target: 'node',
    output: {
        filename: '[name].js',
        path: outPath,
        devtoolModuleFilenameTemplate: '../[resource-path]',
    },
    devtool: 'source-map',
    stats: {
        all: false,
        errors: true,
        warnings: true,
    },
    resolve: {
        extensions: ['.ts', '.js'],
        plugins: [
            new TsconfigPathsPlugin({
                extensions: ['.ts', '.js'],
            }),
        ],
    },
    externals: {
        fsevents: 'commonjs2 fsevents',
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
                // Native node bindings: rewrite 'require' calls.
                // Actual binaries are deployed with CopyPlugin below.
                test: /\.(node)$/,
                loader: 'native-ext-loader',
                options: {
                    emit: false, // The CopyPlugin step will produce these.
                },
            },
        ],
    },
    plugins: [
        new CleanWebpackPlugin(),
        new CopyPlugin({
            patterns: [
                { from: onnxBin, to: 'native/onnxruntime' },
                { from: typeshedFallback, to: 'typeshed-fallback' },
                { from: bundledStubs, to: 'bundled-stubs' },
            ],
        }),
    ],
};
