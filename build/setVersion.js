const assert = require('assert');
const cp = require('child_process');
const detectIndent = require('detect-indent');
const { promises: fsAsync } = require('fs');
const { gitDescribe } = require('git-describe');
const { SemVer } = require('semver');
const util = require('util');
const yargs = require('yargs');

const exec = util.promisify(cp.exec);

/**
 * @param {string} filepath Path to json file to modify.
 * @param {(obj: any) => void} modifier Function that modifies the JSON object.
 */
async function modifyJsonInPlace(filepath, modifier) {
    const input = await fsAsync.readFile(filepath, 'utf-8');
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

    await fsAsync.writeFile(filepath, output, 'utf-8');
}

const metadataFilepath = 'packages/pylance-internal/src/common/metadata.json';

const filesWithVersion = [
    metadataFilepath,
    'packages/pylance/package.json',
    'packages/vscode-pylance/package.json',
    'packages/pylance-internal/package.json',
    'packages/pylance-pythia/package.json',
];

/**
 * @param {string} version Version string.
 */
async function setAllVersions(version) {
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

async function getExactVersion() {
    const gitInfo = await gitDescribe('.', { match: '*.*.*', dirtySemver: false });

    if (!gitInfo.semver || gitInfo.distance) {
        return undefined;
    }

    return gitInfo.semver.format();
}

/**
 *
 * @param {string | undefined} prBuildId
 * @returns {Promise<string>}
 */
async function buildGitVersion(prBuildId) {
    const exact = await getExactVersion();
    if (exact) {
        assert.ok(!prBuildId, `Got prBuildId for exact git tag: ${exact}`);
        return exact;
    }

    // Only match stable releases.
    const gitInfo = await gitDescribe('.', {
        match: '*.*.*',
        dirtySemver: false,
        customArguments: ['--exclude=*-*'],
    });
    assert.ok(gitInfo.semver, `A valid SemVer should have been parsed from git describe, parsed: ${gitInfo.raw}`);
    assert.ok(gitInfo.distance, `Parsed version is exact: ${gitInfo.raw}`);

    // Bump patch version to ensure the current version is semantically after the previous tag.
    gitInfo.semver.patch++;

    if (prBuildId) {
        return `${gitInfo.semver.format()}-pr.${prBuildId}`;
    }

    if (gitInfo.distance) {
        return `${gitInfo.semver.format()}-dev.${gitInfo.distance}.${gitInfo.hash}`;
    }

    return gitInfo.semver.format();
}

async function main() {
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
}

main();
