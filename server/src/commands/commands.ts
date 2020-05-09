/*
 * commands.ts
 *
 * Command identifier strings.
 */

export enum Commands {
    createTypeStub = 'python.createTypeStub',
    orderImports = 'python.orderImports',
    addMissingOptionalToParam = 'python.addOptionalForParam',
    removeUnusedImport = 'python.removeUnusedImport',
    addImport = 'python.addImport',
}

// We'll use a somewhat-arbitrary cutoff value here to determine
// whether it's sufficiently similar. We use a little bit higher number than auto import
// to reduce the number of code actions shown
export const addImportSimilarityLimit = 0.4;
