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
const browserProcess = path.resolve(packages, 'pylance-internal', 'src', 'common', 'browserProcess.ts');

const { binDir: onnxBin } = require('../pylance-internal/build/findonnx');

class PylanceManifestPlugin {
    /**
     * @param {webpack.Compiler} compiler
     */
    apply(compiler) {
        const hookOptions = {
            name: 'PylanceManifestPlugin',
            stage: Infinity,
        };

        compiler.hooks.thisCompilation.tap(hookOptions, (compilation) => {
            compilation.hooks.processAssets.tap(hookOptions, (assets) => {
                const files = Object.keys(assets);

                // Manually add files added by browserConfig; keep synced.
                files.push('browser.server.js', 'browser.extension.js');

                // TODO: Include sizes? Get sizes for browser assets?
                const manifest = {
                    files,
                };

                compilation.emitAsset('folderIndex.json', new webpack.sources.RawSource(JSON.stringify(manifest)));
            });
        });
    }
}

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
            clean: {
                keep: /^browser/, // Ignore the output of the browser config below.
            },
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
            new PylanceManifestPlugin(),
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
            clean: {
                keep: /^(?!browser)/, // Ignore non-browser files.
            },
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
                buffer: require.resolve('buffer/'), // Used by stream
                events: require.resolve('events/'), // Used by stream
                stream: require.resolve('stream-browserify'),
                path: require.resolve('path-browserify'),
                process: browserProcess,
                // Note: this will make these imports empty objects, not make them fail to resolve.
                crypto: false,
                worker_threads: false,
                child_process: false,
            },
        },
        externals: {
            vscode: 'commonjs vscode',
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
            ],
        },
        plugins: [
            new webpack.ProvidePlugin({
                process: browserProcess,
            }),
        ],
    };
};

module.exports = [nodeConfig, browserConfig];
