// Wires in Jest as the test runner in place of the default Mocha.
// Source: https://github.com/facebook/jest/issues/5048

import type { Config } from '@jest/types';
import * as jest from 'jest';
import * as path from 'path';
import * as sourceMapSupport from 'source-map-support';
import { pathsToModuleNameMapper } from 'ts-jest/utils';

// This __dirname is in the output folder, i.e.: out/vscode-pylance/src/tests/jest
const rootDir = path.resolve(__dirname, '../../../../../');
const fromRoot = (...subPaths: string[]): string => path.resolve(rootDir, ...subPaths);
const srcRoot = fromRoot('src');
const outDir = fromRoot('out');
const testEnvDir = fromRoot('out', 'vscode-pylance', 'src', 'tests');
const tsconfig = fromRoot('tsconfig.json');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { compilerOptions } = require(tsconfig);

console.log(`Extension src root: ${srcRoot}`);
console.log(`Extension out dir: ${outDir}`);

export async function run(): Promise<void> {
    // Enable source map support. This is done in the original Mocha test runner,
    // so do it here. It is not clear if this is having any effect.
    sourceMapSupport.install();

    // Redirect stderr to the "real" stdout, rather than the debug output in the VS Code instance.
    process.stderr.write = (line: string) => {
        console.log(line.trimEnd());
        return true;
    };

    const argv: Config.Argv = {
        rootDir,
        useStderr: true,
        verbose: true,
        colors: true,
        transform: JSON.stringify({ '^.+\\.ts$': 'ts-jest' }),
        runInBand: true, // Required due to the way the "vscode" module is injected.
        testRegex: '\\.(test)\\.ts$',
        testEnvironment: path.join(testEnvDir, 'jest', 'jest-vscode-env.js'),
        setupTestFrameworkScriptFile: path.join(testEnvDir, 'jest', 'jest-vscode-setup.js'),
        moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
        moduleNameMapper: JSON.stringify(pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>/' })),
        globals: JSON.stringify({
            'ts-jest': {
                tsconfig,
            },
        }),
        forceExit: true,
        _: [],
        $0: '',
    };
    const { results } = await jest.runCLI(argv, [rootDir]);

    if (results.testResults.some((result) => result.failureMessage)) {
        throw new Error('Tests failed');
    }
}
