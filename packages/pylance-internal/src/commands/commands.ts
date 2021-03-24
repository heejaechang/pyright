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
    runCommands = 'pylance.runCommands',
    triggerParameterHints = 'pylance.triggerParameterHints',
    extractMethod = 'pylance.extractMethod',
    extractVariable = 'pylance.extractVariable',
    dumpFileDebugInfo = 'pylance.dumpFileDebugInfo',
    completionAccepted = 'pylance.completionAccepted',
}
