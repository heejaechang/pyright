/*
 * commands.ts
 *
 * Command identifier strings.
 */

// Command IntelliCode uses to track completion commit in telemetry. Not user-facing.
export const IntelliCodeCompletionCommandPrefix = 'python.intellicode.';

export enum Commands {
    createTypeStub = 'python.createTypeStub',
    orderImports = 'python.orderImports',
    addMissingOptionalToParam = 'python.addOptionalForParam',
    removeUnusedImport = 'python.removeUnusedImport',
    addImport = 'python.addImport',
    // Command IntelliCode uses to track completion commit in telemetry. Not user-facing.
    intelliCodeCompletionItemCommand = 'python.intellicode.completionItemSelected',
    intelliCodeLoadExtension = 'python.intellicode.loadLanguageServerExtension',
}

// We'll use a somewhat-arbitrary cutoff value here to determine
// whether it's sufficiently similar. We use a little bit higher number than auto import
// to reduce the number of code actions shown
export const addImportSimilarityLimit = 0.4;

export const wellKnownAbbreviationMap = new Map<string, string>([
    ['np', 'numpy'],
    ['pd', 'pandas'],
    ['tf', 'tensorflow'],
    ['plt', 'matplotlib.pyplot'],
    ['mpl', 'matplotlib'],
    ['m', 'math'],
    ['spio', 'scipy.io'],
    ['sp', 'scipy'],
]);
