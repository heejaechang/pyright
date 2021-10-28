const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const WebpackObfuscator = require('webpack-obfuscator');
const { cacheConfig, monorepoResourceNameMapper, tsconfigResolveAliases } = require('../pyright/build/lib/webpack');
const webpack = require('webpack');

const outPath = path.resolve(__dirname, 'dist');
const packages = path.resolve(__dirname, '..');

const typeshedFallback = path.resolve(packages, 'pyright', 'packages', 'pyright-internal', 'typeshed-fallback');
const bundled = path.resolve(packages, 'pylance-internal', 'bundled');
const scripts = path.resolve(packages, 'pylance-internal', 'scripts');
const onnxLoader = path.resolve(packages, 'vscode-pylance', 'build', 'onnxLoader.js');

const { binDir: onnxBin } = require('../pylance-internal/build/findonnx');

/**@type {(env: any, argv: { mode: 'production' | 'development' | 'none' }) => import('webpack').Configuration}*/
module.exports = (_, { mode }) => {
    /** @type {import('webpack').Configuration['plugins']} */
    const plugins = [
        new CopyPlugin({
            patterns: [
                { from: onnxBin, to: 'native/onnxruntime' },
                { from: typeshedFallback, to: 'typeshed-fallback' },
                { from: bundled, to: 'bundled' },
                { from: scripts, to: 'scripts' },
            ],
        }),
    ];

    if (mode === 'production') {
        plugins.push(
            new webpack.SourceMapDevToolPlugin({
                filename: '[name].bundle.js.map',
                exclude: ['pylance-langserver.bundle.js'],
                moduleFilenameTemplate: monorepoResourceNameMapper('vscode-pylance'),
                noSources: true,
            }),
            new WebpackObfuscator(
                {
                    sourceMap: false,
                    seed: 258096062,
                    stringArrayRotate: true,
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
            'pylance-langserver': './src/server.ts',
        },
        target: 'node',
        output: {
            filename: '[name].bundle.js',
            path: outPath,
            libraryTarget: 'commonjs2',
            devtoolModuleFilenameTemplate: mode === 'development' ? '../[resource-path]' : undefined,
            clean: true,
        },
        devtool: mode === 'development' ? 'source-map' : undefined,
        cache: mode === 'development' ? cacheConfig(__dirname, __filename) : undefined,
        stats: {
            all: false,
            errors: true,
            warnings: true,
        },
        resolve: {
            extensions: ['.ts', '.js'],
            alias: tsconfigResolveAliases('tsconfig.json'),
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
