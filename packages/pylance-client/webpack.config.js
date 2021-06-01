const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const { TsconfigPathsPlugin } = require('tsconfig-paths-webpack-plugin');

const outPath = path.resolve(__dirname, 'dist');
const packages = path.resolve(__dirname, '..');

const typeshedFallback = path.resolve(packages, 'pyright', 'packages', 'pyright-internal', 'typeshed-fallback');
const bundled = path.resolve(packages, 'pylance-internal', 'bundled');
const schemas = path.resolve(packages, 'pyright', 'packages', 'vscode-pyright', 'schemas');
const scripts = path.resolve(packages, 'pylance-internal', 'scripts');
const onnxLoader = path.resolve(packages, 'vscode-pylance', 'build', 'onnxLoader.js');

const { binDir: onnxBin } = require('../pylance-internal/build/findonnx');

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
        clean: true,
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
                configFile: 'tsconfig.withBaseUrl.json', // TODO: Remove once the plugin understands TS 4.1's implicit baseUrl.
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
                test: /onnxruntime[/\\]lib[/\\]binding.js$/,
                loader: onnxLoader,
            },
            {
                test: /\.ts$/,
                loader: 'ts-loader',
                options: {
                    configFile: 'tsconfig.json',
                },
            },
        ],
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                { from: onnxBin, to: 'native/onnxruntime' },
                { from: typeshedFallback, to: 'typeshed-fallback' },
                { from: bundled, to: 'bundled' },
                { from: schemas, to: 'schemas' },
                { from: scripts, to: 'scripts' },
            ],
        }),
    ],
};
