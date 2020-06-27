import * as detectIndent from 'detect-indent';
import * as fsExtra from 'fs-extra';
import { SemVer } from 'semver';
import type { TaskFunction } from 'undertaker';
import { argv } from 'yargs';

const filesWithVersion = [
    'package.json',
    'package-lock.json',
    'extension/package.json',
    'extension/package-lock.json',
    'server/package.json',
    'server/package-lock.json',
    'server/src/common/version.json',
];

async function setAllVersions(version: string) {
    for (const filepath of filesWithVersion) {
        const input = await fsExtra.readFile(filepath, 'utf-8');
        const indent = detectIndent(input);
        const packageJson = JSON.parse(input);

        console.log(`Modifying ${filepath}: ${packageJson.version} -> ${version}`);
        packageJson.version = version;

        let output = JSON.stringify(packageJson, null, indent.indent);

        if (input.endsWith('\n')) {
            output += '\n';
        }

        if (input.indexOf('\r\n') !== -1) {
            output = output.replace(/\n/g, '\r\n');
        }

        await fsExtra.writeFile(filepath, output, 'utf-8');
    }
}

export const setVersion: TaskFunction = async () => {
    const to = (argv.to as string).trim();
    const toSemVer = new SemVer(to);
    console.log(`Setting version to ${to}; version will appear formatted as ${toSemVer.format()}`);
    await setAllVersions(to);
};
