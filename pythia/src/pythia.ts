/*
 * pythia.ts
 *
 * Command line interface for generating data from repo(s).
 *
 * tsc pythia.ts | node pythia.js
 *
 */

import * as fs from 'fs';
import * as path from 'path';

import { AssignmentWalker } from '../../server/intelliCode/assignmentWalker';
import { ExpressionWalker } from '../../server/intelliCode/expressionWalker';
import { LookbackTokenLength, TrainingInvocations, UsageDataModel } from '../../server/intelliCode/models';
import { TrainingLookBackTokenGenerator } from '../../server/intelliCode/tokens/trainingTokenGenerator';
import { DiagnosticSink } from '../../server/pyright/server/src/common/diagnosticSink';
import { ParseOptions, Parser } from '../../server/pyright/server/src/parser/parser';

const USAGE_OUTPUT_SUFFIX = '_usage.json';
const USAGE_OUTPUT_FOLDER = 'UsageOutput';
const RESULT_OUTPUT_SUFFIX = 'result.json';
const PIPELINE_MODE = 'pipeline';

interface RepoStats {
    methodCount: number;
    invocationCount: number;
}

interface ExecutionResult extends RepoStats {
    references: Map<string, Map<string, TrainingInvocations>> | undefined;
}

// ----- MAIN -----
// Bypass in test mode (jest configuration appears in arguments)
if (process.argv.filter((a) => a.includes('jest')).length === 0) {
    pythiaCliMain(process.argv);
}

export function pythiaCliMain(argv: string[]) {
    argv.length > 1 && argv[2] === PIPELINE_MODE ? processSingleRepo(argv) : processMultipleRepos(argv);
}
// ------ END MAIN -----

function processSingleRepo(argv: string[]): void {
    // In pipeline mode, a single repo is processed.
    if (argv.length < 5) {
        console.log(
            `Invalid arguments for pipeline mode. 
Usage: node <path/pythia.js> pipeline <repo_path> <output_path> <prefix> [lookback token depth]`
        );
        process.exit(1);
    }
    // argv[0] == node.exe
    // argv[1] == <path/pythia.js>
    // argv[2] == 'pipeline'
    // argv[3] == repo path
    // argv[4] == out path
    // argv[5] == prefix
    // argv[6] == look back token depth
    const repoPath = argv[3];
    const outputPath = argv[4];
    const prefix = argv[5];

    const usageOutputPath = path.join(outputPath, USAGE_OUTPUT_FOLDER);
    tryCreateFolder(usageOutputPath);

    // the following parameter is for generating lookback tokens for deep learning model
    // if not supplied, then lookback tokens will be set to null
    let lookback = LookbackTokenLength;
    if (argv.length === 7) {
        lookback = Number.parseInt(argv[6]);
    }

    const rs = processRepo(repoPath, usageOutputPath, lookback, `${prefix}_`);
    if (!rs) {
        return;
    }

    // Write results.json
    const results = Object.create(null);
    results['total_invocation'] = rs.methodCount;
    results['successful_invocation'] = rs.invocationCount;
    const er = {
        success: rs.methodCount > 0,
        results,
    };

    const resultPath = path.join(outputPath, `${prefix}_${RESULT_OUTPUT_SUFFIX}`);
    fs.writeFileSync(resultPath, JSON.stringify(er, null, 4));
    console.log(`Output result to ${resultPath}`);
}

function processRepo(repoPath: string, usageOutputPath: string, lookback: number, prefix = ''): RepoStats | undefined {
    const pythonFiles = getPythonFiles(repoPath);
    // Skip if there are no python files in the repo
    if (pythonFiles.length === 0) {
        return undefined;
    }

    const usageData: UsageDataModel[] = [];
    const solutionName = path.basename(repoPath)?.replace('.', '_');
    const usageDataPath = path.join(usageOutputPath, `${prefix}${solutionName}${USAGE_OUTPUT_SUFFIX}`);

    let methodCount = 0;
    let invocationCount = 0;

    for (const filePath of pythonFiles) {
        const result = processPython(filePath, lookback);
        if (!result || !result.references) {
            continue;
        }

        // Convert maps to arrays for serialization
        const mapData = Object.create(null);
        result.references.forEach((value: Map<string, TrainingInvocations>, key: string) => {
            const invocations = Object.create(null);
            value.forEach((v: TrainingInvocations, k: string) => {
                invocations[k] = v;
            });
            mapData[key] = invocations;
        });

        const data: UsageDataModel = {
            Repo: repoPath,
            Project: repoPath,
            Document: filePath.substr(repoPath.length + 1).replace(',', '_'),
            References: mapData,
        };
        usageData.push(data);

        methodCount += result.methodCount;
        invocationCount += result.invocationCount;
    }

    const json = JSON.stringify(usageData, null, 2);
    fs.writeFileSync(usageDataPath, json, { encoding: 'utf8' });
    console.log(`Output analysis to ${usageDataPath}`);

    return {
        methodCount,
        invocationCount,
    };
}

function processMultipleRepos(argv: string[]): void {
    // argv[0] == node.exe
    // argv[1] == <path/pythia.js>
    // argv[2] == repo path
    // argv[3] == out path
    // argv[4] == look back token depth
    if (argv.length < 4) {
        console.log(
            'Invalid arguments. Expect 2 or 3 arguments: <repos_path> <usage_data_output_path> [lookback token depth]'
        );
        process.exit(1);
    }

    const rootPath = argv[2];
    const usageOutputPath = argv[3];
    tryCreateFolder(usageOutputPath);

    // The following parameter is for generating lookback tokens for deep learning model
    // if not supplied, then lookback tokens will be set to null
    let lookback = LookbackTokenLength;
    if (argv.length === 5) {
        lookback = Number.parseInt(argv[4]);
    }

    console.log('Starting...');
    const repos = fs
        .readdirSync(rootPath, { withFileTypes: true })
        .filter((f) => f.isDirectory)
        .map((f) => f.name);

    console.log(`Found ${repos.length} repos. Please wait, skipping analyzed repos.`);
    // get the list of solution names that are already parsed
    const solutionsAlreadyParsed = getSolutionsAlreadyParsed(usageOutputPath);

    let methodCount = 0;
    let invocationCount = 0;

    for (const folderPath of repos) {
        // skip windows - system volume information
        if (folderPath.includes('System Volume')) {
            return;
        }

        // skip if already parsed
        const solutionPath = path.basename(folderPath);
        const name = solutionPath.replace('.', '_') + USAGE_OUTPUT_SUFFIX;
        if (solutionsAlreadyParsed.includes(name)) {
            return;
        }

        const er = processRepo(folderPath, usageOutputPath, lookback);
        if (er) {
            methodCount += er.methodCount;
            invocationCount += er.invocationCount;
        }
    }

    console.log(`${methodCount}, ${invocationCount}`);
}

// Process a single python file
function processPython(filePath: string, lookback: number): ExecutionResult {
    // console.log(`Analyzing file ${filePath}`);
    let references: Map<string, Map<string, TrainingInvocations>> | undefined;
    let methodCount = 0;
    let invocationCount = 0;

    // Assignment walker
    try {
        const content = fs.readFileSync(filePath, { encoding: 'utf8' });
        const parser = new Parser();
        const pr = parser.parseSourceFile(content, new ParseOptions(), new DiagnosticSink());

        const assignmentWalker = new AssignmentWalker(pr.parseTree);
        assignmentWalker.walk(pr.parseTree);

        const expressionWalker = new ExpressionWalker(assignmentWalker.scopes);
        expressionWalker.walk(pr.parseTree);

        methodCount += expressionWalker.methodCount;
        invocationCount += expressionWalker.methodInvokations.length;

        const tg = new TrainingLookBackTokenGenerator();
        references = tg.generateLookbackTokens(pr.parseTree, content, expressionWalker, lookback);
    } catch (e) {
        console.log(`Exception when parsing file ${filePath}: ${e.message} in ${e.stack}`);
    }

    return {
        methodCount,
        invocationCount,
        references,
    };
}

function tryCreateFolder(folderPath: string) {
    try {
        fs.mkdirSync(folderPath, { recursive: true });
    } catch (e) {
        if (e.code !== 'EEXIST') {
            console.log(`Can't create folder ${folderPath}.`);
            process.exit(2);
        }
    }
}

// Produces list of solutions already parsed
function getSolutionsAlreadyParsed(prevOutputPrefix: string): string[] {
    const list: string[] = [];

    const outputPaths = fs
        .readdirSync(prevOutputPrefix, { withFileTypes: true })
        .filter((f) => f.isFile && path.extname(f.name) === '*.json');
    for (const op of outputPaths) {
        const fileName = path.basename(op.name);
        const parts = fileName.split('_');
        const solution = parts.slice(1);
        list.push(solution.join('_'));
    }
    return list;
}

function getPythonFiles(folderPath: string): string[] {
    const entries = fs.readdirSync(folderPath, { withFileTypes: true });
    const files: string[] = [];
    for (const e of entries) {
        const fullPath = path.join(folderPath, e.name);
        if (e.isFile() && path.extname(e.name) === '.py') {
            files.push(path.join(folderPath, e.name));
        } else if (e.isDirectory()) {
            files.push(...getPythonFiles(fullPath));
        }
    }
    return files;
}
