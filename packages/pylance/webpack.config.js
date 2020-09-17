/* eslint-disable @typescript-eslint/no-var-requires */
//@ts-check

const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const { TsconfigPathsPlugin } = require('tsconfig-paths-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const JavaScriptObfuscator = require('webpack-obfuscator');

const outPath = path.resolve(__dirname, 'dist');
const packages = path.resolve(__dirname, '..');

const typeshedFallback = path.resolve(packages, 'pyright', 'packages', 'pyright-internal', 'typeshed-fallback');
const bundledStubs = path.resolve(packages, 'pylance-internal', 'bundled-stubs');

const onnxRoot = require(path.resolve(packages, 'pylance-internal', 'build', 'findonnx'));
const onnxBin = path.join(onnxRoot, 'bin');

/**@type {(env: string | undefined) => import('webpack').Configuration}*/
module.exports = (env) => {
    // CopyPlugin is typed based on the wrong webpack version, so use any[] to ignore it.
    /** @type {any} */
    const plugins = [
        new CleanWebpackPlugin(),
        new CopyPlugin({
            patterns: [
                { from: onnxBin, to: 'native/onnxruntime' },
                { from: typeshedFallback, to: 'typeshed-fallback' },
                { from: bundledStubs, to: 'bundled-stubs' },
            ],
        }),
    ];

    // TODO: Remove this when webpack-cli 4 merges --mode and --env.
    if (env !== 'development' && env !== 'production') {
        throw new Error(`Please provide either "--env development" or "--env production" -- got ${env}`);
    }

    if (env === 'production') {
        plugins.push(
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
                    'pyright.bundle.js', // Pyright subrepo.
                    'vendor.bundle.js', // node_modules.
                ]
            )
        );
    }

    return {
        context: __dirname,
        entry: {
            'pylance-langserver': './src/server.ts',
        },
        target: 'node',
        output: {
            filename: '[name].bundle.js',
            path: outPath,
            libraryTarget: 'commonjs2',
            devtoolModuleFilenameTemplate: '../[resource-path]',
        },
        devtool: env === 'development' ? 'source-map' : false,
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
                        test: /[\\/]pyright-internal[\\/]/,
                        priority: -20,
                    },
                },
            },
        },
        plugins,
    };
};
