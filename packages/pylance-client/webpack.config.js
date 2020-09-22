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
const schemas = path.resolve(packages, 'pyright', 'packages', 'vscode-pyright', 'schemas');
const scripts = path.resolve(packages, 'pylance-internal', 'scripts');

const onnxRoot = require(path.resolve(packages, 'pylance-internal', 'build', 'findonnx'));
const onnxBin = path.join(onnxRoot, 'bin');

/**@type {import('webpack').Configuration}*/
module.exports = {
    context: __dirname,
    entry: {
        extension: './src/extension.ts',
        server: './src/server.ts',
    },
    target: 'node',
    output: {
        filename: '[name].js',
        path: outPath,
        libraryTarget: 'commonjs2',
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
        vscode: 'commonjs vscode',
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
                { from: schemas, to: 'schemas' },
                { from: scripts, to: 'scripts' },
            ],
        }),
    ],
};
