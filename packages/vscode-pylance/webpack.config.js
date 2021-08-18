const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const WebpackObfuscator = require('webpack-obfuscator');
const TerserPlugin = require('terser-webpack-plugin');
const { cacheConfig, monorepoResourceNameMapper, tsconfigResolveAliases } = require('../pyright/build/lib/webpack');
const webpack = require('webpack');

const outPath = path.resolve(__dirname, 'dist');
const packages = path.resolve(__dirname, '..');

const typeshedFallback = path.resolve(packages, 'pyright', 'packages', 'pyright-internal', 'typeshed-fallback');
const bundled = path.resolve(packages, 'pylance-internal', 'bundled');
const schemas = path.resolve(packages, 'pyright', 'packages', 'vscode-pyright', 'schemas');
const scripts = path.resolve(packages, 'pylance-internal', 'scripts');
const onnxLoader = path.resolve(__dirname, 'build', 'onnxLoader.js');
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

/** @type {import('javascript-obfuscator').ObfuscatorOptions} */
const obfuscatorConfig = {
    sourceMap: false,
    seed: 258096062,
    rotateStringArray: true,
    shuffleStringArray: true,
    splitStrings: true,
    splitStringsChunkLength: 10,
    stringArray: true,
    stringArrayEncoding: ['base64'],
    stringArrayThreshold: 0.75,
    transformObjectKeys: true,
};

/** @type {(env: any, argv: { mode: 'production' | 'development' | 'none' }) => import('webpack').Configuration} */
const nodeConfig = (_, { mode }) => {
    /** @type {import('webpack').Configuration['plugins']} */
    const plugins = [
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
            new webpack.SourceMapDevToolPlugin({
                filename: '[name].bundle.js.map',
                exclude: ['extension.bundle.js', 'server.bundle.js'],
                moduleFilenameTemplate: monorepoResourceNameMapper('vscode-pylance'),
                noSources: true,
            }),
            new WebpackObfuscator(obfuscatorConfig, [
                // Chunks to not obfuscate.
                'pyright.bundle.js', // Pyright subrepo.
                'vendor.bundle.js', // node_modules.
            ])
        );
    }

    plugins.push(new PylanceManifestPlugin());

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
            devtoolModuleFilenameTemplate: mode === 'development' ? '../[resource-path]' : undefined,
            clean: {
                keep: /^browser/, // Ignore the output of the browser config below.
            },
        },
        devtool: mode === 'development' ? 'source-map' : undefined,
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
        optimization: {
            usedExports: true,
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

/**@type {(env: any, argv: { mode: 'production' | 'development' | 'none' }) => import('webpack').Configuration}*/
const browserConfig = (_, { mode }) => {
    /** @type {import('webpack').Configuration['plugins']} */
    const plugins = [
        new webpack.ProvidePlugin({
            process: browserProcess,
        }),
    ];

    if (mode === 'production') {
        plugins.push(
            new webpack.SourceMapDevToolPlugin({
                filename: 'browser.[name].bundle.js.map',
                exclude: ['browser.extension.bundle.js', 'browser.server.bundle.js'],
                moduleFilenameTemplate: monorepoResourceNameMapper('vscode-pylance'),
                noSources: true,
            }),
            new WebpackObfuscator({ ...obfuscatorConfig, target: 'browser' }, [
                // Chunks to not obfuscate.
                // 'browser.pyright.bundle.js', // Pyright subrepo.
                // 'browser.vendor.bundle.js', // node_modules.
            ])
        );
    }

    return {
        context: __dirname,
        entry: {
            extension: {
                import: './src/browserExtension.ts',
                library: {
                    type: 'commonjs2',
                },
            },
            server: {
                import: './src/browserServer.ts',
                // The server is loaded in a Worker and is not a library. Attempting
                // to export (e.g. via commonjs exports) will crash.
            },
        },
        target: 'webworker',
        output: {
            filename: 'browser.[name].bundle.js',
            path: outPath,
            devtoolModuleFilenameTemplate:
                // Use absolute paths, as when run in vscode.dev, we're not running inside of the pyrx repo.
                mode === 'development' ? '[absolute-resource-path]' : monorepoResourceNameMapper('vscode-pylance'),
            clean: {
                keep: /^(?!browser)/, // Ignore non-browser files.
            },
        },
        devtool: mode === 'development' ? 'source-map' : undefined,
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
                querystring: require.resolve('querystring-es3'),
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
        performance: {
            hints: false, // Silence webpack's warnings about the size of our chunks.
        },
        // Doesn't work in vscode.dev.
        // optimization: {
        //     usedExports: true,
        //     splitChunks: {
        //         cacheGroups: {
        //             defaultVendors: {
        //                 name: 'vendor',
        //                 test: /[\\/]node_modules[\\/]/,
        //                 chunks: 'all',
        //                 priority: -10,
        //             },
        //             pyright: {
        //                 name: 'pyright',
        //                 chunks: 'all',
        //                 test: /[\\/]pyright-internal[\\/]/,
        //                 priority: -20,
        //             },
        //         },
        //     },
        // },
        plugins,
    };
};

module.exports = [nodeConfig, browserConfig];
