const webpack = require('webpack');
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const { cacheConfig, monorepoResourceNameMapper, tsconfigResolveAliases } = require('../pyright/build/lib/webpack');

const outPath = path.resolve(__dirname, 'dist');
const packages = path.resolve(__dirname, '..');

const typeshedFallback = path.resolve(packages, 'pyright', 'packages', 'pyright-internal', 'typeshed-fallback');
const bundled = path.resolve(packages, 'pylance-internal', 'bundled');
const schemas = path.resolve(packages, 'pyright', 'packages', 'vscode-pyright', 'schemas');
const scripts = path.resolve(packages, 'pylance-internal', 'scripts');
const onnxLoader = path.resolve(packages, 'vscode-pylance', 'build', 'onnxLoader.js');

const { binDir: onnxBin } = require('../pylance-internal/build/findonnx');

/**@type {(env: any, argv: { mode: 'production' | 'development' | 'none' }) => import('webpack').Configuration}*/
const nodeConfig = (_, { mode }) => {
    return {
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
            devtoolModuleFilenameTemplate:
                mode === 'development' ? '../[resource-path]' : monorepoResourceNameMapper('pylance-client'),
            // clean: true,
        },
        devtool: 'source-map',
        cache: mode === 'development' ? cacheConfig(__dirname, __filename, `node-${mode}`) : undefined,
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
};

/**@type {(env: any, argv: { mode: 'production' | 'development' | 'none' }) => import('webpack').Configuration}*/
const browserConfig = (_, { mode }) => {
    return {
        context: __dirname,
        entry: {
            extension: {
                import: './src/browser/extension.ts',
                library: {
                    type: 'commonjs2',
                },
            },
            server: {
                import: './src/browser/server.ts',
                // The server is loaded in a Worker and is not a library. Attempting
                // to export (e.g. via commonjs exports) will crash.
            },
        },
        target: 'webworker',
        output: {
            filename: 'browser.[name].js',
            path: outPath,
            devtoolModuleFilenameTemplate:
                // Use absolute paths, as when run in vscode.dev, we're not running inside of the pyrx repo.
                mode === 'development' ? '[absolute-resource-path]' : monorepoResourceNameMapper('pylance-client'),
            // TODO: figure out cleaning when we output two webpacks to the same folder
            // clean: true,
        },
        devtool: 'source-map',
        cache: mode === 'development' ? cacheConfig(__dirname, __filename, `browser-${mode}`) : undefined,
        stats: {
            all: false,
            errors: true,
            warnings: true,
        },
        resolve: {
            extensions: ['.ts', '.js'],
            alias: tsconfigResolveAliases('tsconfig.json'),
            fallback: {
                // TODO: Once we de-nodify the bundle (FS, chokidar, IntelliCode), try removing each of these.
                path: require.resolve('path-browserify'),
                os: require.resolve('os-browserify'),
                zlib: require.resolve('browserify-zlib'),
                stream: require.resolve('stream-browserify'),
                events: require.resolve('events/'),
                url: require.resolve('url/'),
                buffer: require.resolve('buffer/'),
                console: require.resolve('console-browserify'),
                util: require.resolve('util/'),
                assert: require.resolve('assert/'),
                process: require.resolve('process/browser'),
                // Note: this will make these imports empty objects, not make them fail to resolve.
                crypto: false,
                fs: false,
                worker_threads: false,
                child_process: false,
                fsevents: false,
            },
        },
        plugins: [
            new webpack.ProvidePlugin({
                process: require.resolve('process/browser'),
            }),
        ],
        externals: {
            vscode: 'commonjs vscode',
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
    };
};

module.exports = [nodeConfig, browserConfig];
