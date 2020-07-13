/**
 * webpack.config.js
 * Copyright: Microsoft 2019
 *
 * Configuration for webpack to bundle the javascript into a single file
 * for the Pylance language server.
 */

/* eslint-disable @typescript-eslint/no-var-requires */
//@ts-check

const path = require('path');
const webpack = require('webpack');
const CopyPlugin = require('copy-webpack-plugin');
const JavaScriptObfuscator = require('webpack-obfuscator');

const nodeModules = 'node_modules';
const serverFolder = path.resolve(__dirname, '.');
const serverNodeModules = path.join(serverFolder, nodeModules);
const onnxBin = path.join(serverNodeModules, 'onnxruntime', 'bin');
const outputPath = path.resolve(__dirname, path.join(serverFolder, '..', 'extension', 'server'));
const onnxOut = path.join(outputPath, 'native', 'onnxruntime');

/**@type {import('webpack').Configuration}*/
module.exports = {
    context: serverFolder,
    entry: {
        server: path.join(serverFolder, 'server.ts'),
    },
    mode: 'production',
    // mode: 'development',
    // devtool: 'source-map',
    target: 'node',
    output: {
        path: outputPath,
        // Main entrypoint must be called "server.bundle.js".
        // See also Platform.isBundle, which checks for this name.
        filename: '[name].bundle.js',
        libraryTarget: 'commonjs2',
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
                options: {
                    emit: false, // The CopyPlugin step will produce these.
                },
            },
        ],
    },
    plugins: [
        new webpack.EnvironmentPlugin({
            NUGETPACKAGEVERSION: '',
        }),
        new CopyPlugin({ patterns: [{ from: onnxBin, to: onnxOut }] }),
        new JavaScriptObfuscator(
            {
                seed: 258096062,
                rotateStringArray: true,
                shuffleStringArray: true,
                splitStrings: true,
                splitStringsChunkLength: 10,
                stringArray: true,
                stringArrayEncoding: 'base64',
                stringArrayThreshold: 0.75,
            },
            [
                // Chunks to not obfuscate.
                'server.bundle.js', // Main entrypoint generated by webpack.
                'pyright.bundle.js', // Pyright subrepo.
                'vendor.bundle.js', // node_modules.
            ]
        ),
    ],
    optimization: {
        usedExports: true,
        splitChunks: {
            cacheGroups: {
                defaultVendors: {
                    name: 'vendor',
                    test: /[\\/]node_modules[\\/]/,
                    chunks: 'all',
                    priority: -10,
                },

                pyright: {
                    name: 'pyright',
                    chunks: 'all',
                    test: /[\\/]server[\\/]pyright[\\/]/,
                    priority: -20,
                },

                default: {
                    name: 'pylance',
                    chunks: 'all',
                    priority: -30,
                    reuseExistingChunk: true,
                },
            },
        },
    },
};
