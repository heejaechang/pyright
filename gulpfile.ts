import * as assert from 'assert';
import * as cp from 'child_process';
import { default as detectIndent } from 'detect-indent';
import * as fsExtra from 'fs-extra';
import { gitDescribe } from 'git-describe';
import { default as globImpl } from 'glob';
import ncu from 'npm-check-updates';
import { default as PQueue } from 'p-queue';
import * as path from 'path';
import { SemVer } from 'semver';
import type { TaskFunction } from 'undertaker';
import * as util from 'util';
import * as yargs from 'yargs';

const glob = util.promisify(globImpl);
const exec = util.promisify(cp.exec);

async function modifyJsonInPlace(filepath: string, modifier: (obj: any) => void) {
    const input = await fsExtra.readFile(filepath, 'utf-8');
    const indent = detectIndent(input);
    const obj = JSON.parse(input);

    modifier(obj);

    let output = JSON.stringify(obj, null, indent.indent);

    if (input.endsWith('\n')) {
        output += '\n';
    }

    if (input.indexOf('\r\n') !== -1) {
        output = output.replace(/\n/g, '\r\n');
    }

    await fsExtra.writeFile(filepath, output, 'utf-8');
}

const metadataFilepath = 'packages/pylance-internal/src/common/metadata.json';

// Don't bother updating package-lock.json; setVersion is used in the build where doing this
// messes with npm caching, and these files aren't referenced from real code or shipped.
const filesWithVersion = [
    metadataFilepath,
    'packages/pylance/package.json',
    'packages/vscode-pylance/package.json',
    'packages/pylance-internal/package.json',
    'packages/pylance-pythia/package.json',
];

async function setAllVersions(version: string) {
    for (const filepath of filesWithVersion) {
        await modifyJsonInPlace(filepath, (obj) => {
            console.log(`Modifying ${filepath}: ${obj.version} -> ${version}`);
            obj.version = version;
        });
    }
}

async function setPyrightCommit() {
    const { stdout } = await exec('git config --file packages/pyright/.gitrepo subrepo.commit');
    const pyrightCommit = stdout.trim();

    await modifyJsonInPlace(metadataFilepath, (obj) => {
        console.log(`Modifying ${metadataFilepath}: pyrightCommit = ${pyrightCommit}`);
        obj.pyrightCommit = pyrightCommit;
    });
}

async function buildGitVersion(prBuildId?: string): Promise<string> {
    const gitInfo = await gitDescribe('.', { match: '*.*.*', dirtySemver: false });
    assert.ok(gitInfo.semver, `A valid SemVer should have been parsed from git describe, parsed: ${gitInfo.raw}`);

    if (gitInfo.distance) {
        // Bump patch version to ensure the current version is semantically after the previous tag.
        gitInfo.semver.patch++;
    }

    if (prBuildId) {
        return `${gitInfo.semver.format()}-pr.${prBuildId}`;
    }

    if (gitInfo.distance) {
        return `${gitInfo.semver.format()}-dev.${gitInfo.distance}.${gitInfo.hash}`;
    }

    return gitInfo.semver.format();
}

export const setVersion: TaskFunction = async () => {
    const argv = yargs.options({
        to: { type: 'string' },
        prBuildId: { type: 'string' },
    }).argv;

    let to = argv.to;
    if (!to) {
        to = await buildGitVersion(argv.prBuildId);
    }

    const toSemVer = new SemVer(to);
    console.log(`Setting version to ${to}; version will appear formatted as ${toSemVer.format()}`);
    await setAllVersions(to);

    await setPyrightCommit();
};

export const updateAllDeps: TaskFunction = async () => {
    const argv = yargs.options({
        transitive: { type: 'boolean' },
    }).argv;

    const queue = new PQueue({ concurrency: 4 });

    const lernaFile = await fsExtra.readFile('lerna.json', 'utf-8');

    const lernaConfig: { packages: string[] } = JSON.parse(lernaFile);

    const matches = await Promise.all(lernaConfig.packages.map((pattern) => glob(pattern + '/package.json')));
    const allPackages = ['package.json'].concat(...matches);

    await Promise.all(
        allPackages.map(async (packageFile) => {
            packageFile = path.resolve(packageFile);
            const packagePath = path.dirname(packageFile);
            const packageName = path.basename(packagePath);

            console.log(`${packageName}: updating with ncu`);
            await ncu.run({
                packageFile: packageFile,
                target: 'minor',
                upgrade: true,
                reject: ['@types/vscode', 'vsce', 'onnxruntime'],
            });

            if (argv.transitive) {
                console.log(`${packageName}: removing package-lock.json and node_modules`);
                await fsExtra.remove(path.join(packagePath, 'package-lock.json'));
                await fsExtra.remove(path.join(packagePath, 'node_modules'));
            }

            await queue.add(async () => {
                console.log(`${packageName}: reinstalling package`);
                await exec('npm install', {
                    cwd: packagePath,
                    env: {
                        ...process.env,
                        SKIP_LERNA_BOOTSTRAP: 'yes',
                        SKIP_GET_ONNX: argv.transitive ? 'yes' : undefined,
                    },
                });
            });
        })
    );

    if (argv.transitive) {
        console.log('pylance-internal: re-running npm install for onnxruntime');
        await exec('npm install', { cwd: 'packages/pylance-internal' });
    }
};
