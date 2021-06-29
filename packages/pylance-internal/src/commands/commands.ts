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
    intelliCodeCompletionItemCommand = 'python.intellicode.completionItemSelected',
    intelliCodeLoadExtension = 'python.intellicode.loadLanguageServerExtension',
    extractMethod = 'pylance.extractMethod',
    extractVariable = 'pylance.extractVariable',
    dumpFileDebugInfo = 'pylance.dumpFileDebugInfo',
    completionAccepted = 'pylance.completionAccepted',
    executedClientCommand = 'pylance.executedClientCommand',
}

export enum ClientCommands {
    reportIssue = 'pylance.reportIssue',
    triggerParameterHints = 'pylance.triggerParameterHints',
    runCommands = 'pylance.runCommands',
    extractMethodWithRename = 'pylance.extractMethodWithRename',
    extractVariableWithRename = 'pylance.extractVariableWithRename',
    addToExtraPaths = 'pylance.addToExtraPaths',
}
