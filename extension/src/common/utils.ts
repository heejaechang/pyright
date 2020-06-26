import * as crypto from 'crypto';
import * as path from 'path';

let extensionRootFolder: string;

export function setExtensionRoot(extensionRoot: string): void {
    extensionRootFolder = extensionRoot;
}

export function getExtensionRoot(): string {
    if (extensionRootFolder) {
        return extensionRootFolder;
    }
    // Possible case in tests. Use heuristics.
    const folderName = path.basename(__dirname);
    switch (folderName) {
        case 'tests':
        case 'common':
            return path.join(__dirname, '..', '..');
        case 'src':
            return path.join(__dirname, '..');
    }
    throw new Error('Unable to determine extension root.');
}

function getRandom(): number {
    let num = 0;

    const buf: Buffer = crypto.randomBytes(2);
    num = (buf.readUInt8(0) << 8) + buf.readUInt8(1);

    const maxValue: number = Math.pow(16, 4) - 1;
    return num / maxValue;
}

export function getRandomBetween(min = 0, max = 10): number {
    const randomVal: number = getRandom();
    return min + randomVal * (max - min);
}
