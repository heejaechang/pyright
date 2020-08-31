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

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { compilerOptions } = require(fromRoot('tsconfig.json'));

console.log(`Extension src root: ${srcRoot}`);
console.log(`Extension out dir: ${outDir}`);

export async function run(_testRoot: string, callback: TestRunnerCallback): Promise<void> {
    // Enable source map support. This is done in the original Mocha test runner,
    // so do it here. It is not clear if this is having any effect.
    sourceMapSupport.install();

    // Forward logging from Jest to the Debug Console.
    forwardStdoutStderrStreams();

    try {
        const argv: Config.Argv = {
            rootDir: path.resolve(srcRoot, 'tests'),
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
                    tsConfig: path.join(rootDir, 'tsconfig.json'),
                },
            }),
            forceExit: true,
            _: [],
            $0: '',
        };
        const { results } = await jest.runCLI(argv, [rootDir]);
        const failures = collectTestFailureMessages(results);

        if (failures.length > 0) {
            callback(null, failures);
            return;
        }

        callback(null);
    } catch (e) {
        callback(e);
    }
}

// Collect failure messages from Jest test results.
function collectTestFailureMessages(results: any): string[] {
    const failures = results.testResults.reduce((acc: any[], testResult: { failureMessage: any }) => {
        if (testResult.failureMessage) acc.push(testResult.failureMessage);
        return acc;
    }, []);

    return failures;
}

// Forward writes to process.stdout and process.stderr to console.log.
function forwardStdoutStderrStreams() {
    const logger = (line: string) => {
        console.log(line.trimEnd());
        return true;
    };

    process.stdout.write = logger;
    process.stderr.write = logger;
}

export type TestRunnerCallback = (error: Error | null, failures?: any) => void;
