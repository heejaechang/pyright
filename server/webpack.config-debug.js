/**
* webpack.config-debug.js
* Copyright: Microsoft 2019
*
* Configuration for webpack to bundle the javascript into a folder in the client for debugging.
*/

const path = require('path');

module.exports = {
    context: path.resolve(__dirname),
    entry: './src/server.ts',
    mode: 'development',
    target: 'node',
    devtool: 'source-map',
    output: {
        filename: 'server.js',
        path: path.resolve(__dirname, '../client/server')
    },
    optimization: {
        usedExports: true,
    },
    resolve: {
        modules: [
            path.resolve(__dirname, '.'),
            'node_modules'
        ],
        extensions: ['.js', '.ts']
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                loader: 'ts-loader',
                options: {
                    configFile: 'tsconfig.json'
                }
            },
            {
                test: /\.node$/,
                use: 'node-loader'
            }
        ]
    },
    node: {
        fs: 'empty',
        __dirname: false,
        __filename: false
    }
};
