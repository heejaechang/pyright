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
