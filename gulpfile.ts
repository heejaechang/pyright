import * as assert from 'assert';
import * as cp from 'child_process';
import { default as detectIndent } from 'detect-indent';
import * as fsExtra from 'fs-extra';
import { gitDescribe } from 'git-describe';
import { SemVer } from 'semver';
import type { TaskFunction } from 'undertaker';
import * as util from 'util';
import * as yargs from 'yargs';

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

const metadataFilepath = 'server/src/common/metadata.json';

const filesWithVersion = [
    metadataFilepath,
    'package.json',
    'package-lock.json',
    'extension/package.json',
    'extension/package-lock.json',
    'server/package.json',
    'server/package-lock.json',
    'pythia/package.json',
    'pythia/package-lock.json',
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
    const { stdout } = await exec('git config --file server/pyright/.gitrepo subrepo.commit');
    const pyrightCommit = stdout.trim();

    await modifyJsonInPlace(metadataFilepath, (obj) => {
        console.log(`Modifying ${metadataFilepath}: pyrightCommit = ${pyrightCommit}`);
        obj.pyrightCommit = pyrightCommit;
    });
}

async function buildGitVersion(prBuildId?: string): Promise<string> {
    const gitInfo = await gitDescribe('.', { match: '*.*.*', dirtySemver: false });
    assert.ok(gitInfo.semver, `A valid SemVer should have been parsed from git describe, parsed: ${gitInfo.raw}`);

    if (prBuildId) {
        return `${gitInfo.semver.format()}-pr.${prBuildId}`;
    }

    if (gitInfo.distance) {
        gitInfo.semver.patch++;
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
