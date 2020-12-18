/**
 * webpack.config-cli.js
 * Copyright: Microsoft 2018
 */

/* eslint-disable @typescript-eslint/no-var-requires */
//@ts-check

const path = require('path');
const { TsconfigPathsPlugin } = require('tsconfig-paths-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

const outPath = path.resolve(__dirname, 'dist');

/**@type {import('webpack').Configuration}*/
module.exports = {
    context: __dirname,
    entry: {
        pythia: './src/index.ts',
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
                configFile: 'tsconfig.withBaseUrl.json', // TODO: Remove once the plugin understands TS 4.1's implicit baseUrl.
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
        ],
    },
    plugins: [new CleanWebpackPlugin()],
};
