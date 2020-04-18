/*
 * pythia.test.ts
 *
 * IntelliCode CLI tests.
 */

import 'jest-extended';

import * as fs from 'fs';
import * as path from 'path';

import { pythiaCliMain } from '../pythia';

// Test folder: src/tests
// Test repo: src/tests/data/repo
// Output for a repo: src/tests/out/repo
// Baselines for a give repo: src/tests/baseline/repo
const testFolder = path.join(process.cwd(), 'src', 'tests');
const testDataFolder = path.join(testFolder, 'data');
const testOutFolder = path.join(testFolder, 'out');
const testBaselineFolder = path.join(testFolder, 'baseline');

test('IntelliCode CLI smoke test', () => runTest('repo1'));

function runTest(repoName: string): void {
    runCLI(repoName);
    verifyResult(repoName);
}

function runCLI(repoName: string): void {
    // pipeline <repo_path> <output_path> <prefix>
    const repoPath = path.join(testDataFolder, repoName);
    const outPath = path.join(testOutFolder, repoName);
    const argv = ['node.exe', 'pythia.js', 'pipeline', repoPath, outPath, repoName];
    pythiaCliMain(argv);
}

function verifyResult(repoName: string): void {
    const expectedUsage = fs.readFileSync(
        path.join(testBaselineFolder, repoName, 'UsageOutput', `${repoName}_${repoName}_usage.json`),
        { encoding: 'utf8' }
    );
    const actualUsage = fs.readFileSync(
        path.join(testOutFolder, repoName, 'UsageOutput', `${repoName}_${repoName}_usage.json`),
        { encoding: 'utf8' }
    );
    compareFiles(actualUsage, expectedUsage);

    const expectedResult = fs.readFileSync(path.join(testBaselineFolder, repoName, `${repoName}_result.json`), {
        encoding: 'utf8',
    });
    const actualResult = fs.readFileSync(path.join(testOutFolder, repoName, `${repoName}_result.json`), {
        encoding: 'utf8',
    });
    compareFiles(actualResult, expectedResult);
}

function compareFiles(expectedResult: string, actualResult: string) {
    const expectedLines = expectedResult.replace('\r', '').split('\n');
    const actualLines = actualResult.replace('\r', '').split('\n');
    expect(actualLines.length).toEqual(expectedLines.length);
    for (let i = 0; i < actualLines.length; i++) {
        expect(actualLines[i].trim()).toEqual(expectedLines[i].trim());
    }
}
