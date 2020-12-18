/* eslint-disable @typescript-eslint/no-var-requires */
//@ts-check

const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const { TsconfigPathsPlugin } = require('tsconfig-paths-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const JavaScriptObfuscator = require('webpack-obfuscator');
const TerserPlugin = require('terser-webpack-plugin');
const { monorepoResourceNameMapper } = require('../pyright/build/lib/webpack');

const outPath = path.resolve(__dirname, 'dist');
const packages = path.resolve(__dirname, '..');

const typeshedFallback = path.resolve(packages, 'pyright', 'packages', 'pyright-internal', 'typeshed-fallback');
const bundled = path.resolve(packages, 'pylance-internal', 'bundled');
const schemas = path.resolve(packages, 'pyright', 'packages', 'vscode-pyright', 'schemas');
const scripts = path.resolve(packages, 'pylance-internal', 'scripts');

const onnxRoot = require(path.resolve(packages, 'pylance-internal', 'build', 'findonnx'));
const onnxBin = path.join(onnxRoot, 'bin');

/**@type {(env: any, argv: { mode: 'production' | 'development' | 'none' }) => import('webpack').Configuration}*/
module.exports = (_, { mode }) => {
    // CopyPlugin is typed based on the wrong webpack version, so use any[] to ignore it.
    /** @type {any} */
    const plugins = [
        new CleanWebpackPlugin(),
        new CopyPlugin({
            patterns: [
                { from: onnxBin, to: 'native/onnxruntime' },
                { from: typeshedFallback, to: 'typeshed-fallback' },
                { from: bundled, to: 'bundled' },
                { from: schemas, to: 'schemas' },
                { from: scripts, to: 'scripts' },
            ],
        }),
    ];

    if (mode === 'production') {
        plugins.push(
            new JavaScriptObfuscator(
                {
                    seed: 258096062,
                    rotateStringArray: true,
                    shuffleStringArray: true,
                    splitStrings: true,
                    splitStringsChunkLength: 10,
                    stringArray: true,
                    stringArrayEncoding: ['base64'],
                    stringArrayThreshold: 0.75,
                    transformObjectKeys: true,
                },
                [
                    // Chunks to not obfuscate.
                    'pyright.bundle.js', // Pyright subrepo.
                    'vendor.bundle.js', // node_modules.
                ]
            )
        );
    }

    return {
        context: __dirname,
        entry: {
            extension: './src/extension.ts',
            server: './src/server.ts',
        },
        target: 'node',
        output: {
            // The server file name must always be server.bundle.js in order to be
            // found by the core extension. If the LSP client moves into this extension,
            // this will no longer be needed.
            filename: '[name].bundle.js',
            path: outPath,
            libraryTarget: 'commonjs2',
            devtoolModuleFilenameTemplate:
                mode === 'development' ? '../[resource-path]' : monorepoResourceNameMapper('vscode-pylance'),
        },
        devtool: mode === 'development' ? 'source-map' : 'nosources-source-map',
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
        optimization: {
            usedExports: true,
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            //@ts-ignore
            minimizer:
                mode === 'production'
                    ? [
                          new TerserPlugin({
                              terserOptions: {
                                  keep_fnames: /AbortSignal/, // Work around node-fetch@2 bug.
                              },
                          }),
                      ]
                    : undefined,
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
                        test: /[\\/]pyright-internal[\\/]/,
                        priority: -20,
                    },
                },
            },
        },
        plugins,
    };
};
