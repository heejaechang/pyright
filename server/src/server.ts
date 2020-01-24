/*
* server.ts
*
* Implements pyright language server.
*/

import {
    CodeAction, CodeActionKind, Command, createConnection,
    Diagnostic, DiagnosticRelatedInformation, DiagnosticSeverity, DiagnosticTag,
    DocumentSymbol, ExecuteCommandParams, IConnection, InitializeResult, IPCMessageReader,
    IPCMessageWriter, Location, MarkupKind, ParameterInformation, Position, Range,
    ResponseError, SignatureInformation, SymbolInformation, TextDocuments, TextEdit, WorkspaceEdit
} from 'vscode-languageserver';
import { URI } from 'vscode-uri';

import { AnalyzerService } from './analyzer/service';
import { CommandLineOptions } from './common/commandLineOptions';
import {
    AddMissingOptionalToParamAction, CreateTypeStubFileAction, Diagnostic as AnalyzerDiagnostic,
    DiagnosticCategory
} from './common/diagnostic';
import { combinePaths, getDirectoryPath, normalizePath } from './common/pathUtils';
import {
    commandAddMissingOptionalToParam, commandCreateTypeStub,
    commandOrderImports
} from './languageService/commands';
import { CompletionItemData } from './languageService/completionProvider';
import { LineAndColumnRange, LineAndColumn } from './common/textRange';

interface PythonSettings {
    venvPath?: string;
    pythonPath?: string;
    analysis?: {
        typeshedPaths: string[];
    };
}

interface PyrightSettings {
    disableLanguageServices?: boolean;
    openFilesOnly?: boolean;
    useLibraryCodeForTypes?: boolean;
}

interface WorkspaceServiceInstance {
    workspaceName: string;
    rootPath: string;
    rootUri: string;
    serviceInstance: AnalyzerService;
    disableLanguageServices: boolean;
}

// Stash the base directory into a global variable.
(global as any).__rootDirectory = getDirectoryPath(__dirname);

// Create a connection for the server. The connection uses Node's IPC as a transport
const _connection: IConnection = createConnection(new IPCMessageReader(process), new IPCMessageWriter(process));

_connection.console.log('Pyright language server starting');

// Create a simple text document manager. The text document manager
// supports full document sync only.
const _documents: TextDocuments = new TextDocuments();

// Global root path - the basis for all global settings.
let _rootPath = '';

// Tracks whether we're currently displaying progress.
let _isDisplayingProgress = false;

const _workspaceMap = new Map<string, WorkspaceServiceInstance>();

// Make the text document manager listen on the connection
// for open, change and close text document events.
_documents.listen(_connection);

const _defaultWorkspacePath = '<default>';

// Creates a service instance that's used for analyzing a
// program within a workspace.
function _createAnalyzerService(name: string): AnalyzerService {
    _connection.console.log(`Starting service instance "${ name }"`);
    const service = new AnalyzerService(name, _connection.console);

    // Don't allow the analysis engine to go too long without
    // reporting results. This will keep it responsive.
    service.setMaxAnalysisDuration({
        openFilesTimeInMs: 50,
        noOpenFilesTimeInMs: 200
    });

    service.setCompletionCallback(results => {
        results.diagnostics.forEach(fileDiag => {
            const diagnostics = _convertDiagnostics(fileDiag.diagnostics);

            // Send the computed diagnostics to the client.
            _connection.sendDiagnostics({
                uri: _convertPathToUri(fileDiag.filePath),
                diagnostics
            });

            if (results.filesRequiringAnalysis > 0) {
                if (!results.checkingOnlyOpenFiles) {
                    // Display a progress spinner if we're checking the entire program.
                    if (!_isDisplayingProgress) {
                        _isDisplayingProgress = true;
                        _connection.sendNotification('pyright/beginProgress');
                    }

                    const fileOrFiles = results.filesRequiringAnalysis !== 1 ? 'files' : 'file';
                    _connection.sendNotification('pyright/reportProgress',
                        `${ results.filesRequiringAnalysis } ${ fileOrFiles } to analyze`);
                }
            } else {
                if (_isDisplayingProgress) {
                    _isDisplayingProgress = false;
                    _connection.sendNotification('pyright/endProgress');
                }
            }
        });
    });

    return service;
}

// Creates a service instance that's used for creating type
// stubs for a specified target library.
function _createTypeStubService(importName: string,
    complete: (success: boolean) => void): AnalyzerService {

    _connection.console.log('Starting type stub service instance');
    const service = new AnalyzerService('Type stub',
        _connection.console);

    service.setMaxAnalysisDuration({
        openFilesTimeInMs: 500,
        noOpenFilesTimeInMs: 500
    });

    service.setCompletionCallback(results => {
        if (results.filesRequiringAnalysis === 0) {
            try {
                service.writeTypeStub();
                service.dispose();
                const infoMessage = `Type stub was successfully created for '${ importName }'.`;
                _connection.window.showInformationMessage(infoMessage);
                complete(true);
            } catch (err) {
                let errMessage = '';
                if (err instanceof Error) {
                    errMessage = ': ' + err.message;
                }
                errMessage = `An error occurred when creating type stub for '${ importName }'` +
                    errMessage;
                _connection.console.error(errMessage);
                _connection.window.showErrorMessage(errMessage);
                complete(false);
            }
        }
    });

    return service;
}

function _handlePostCreateTypeStub() {
    _workspaceMap.forEach(workspace => {
        workspace.serviceInstance.handlePostCreateTypeStub();
    });
}

// After the server has started the client sends an initialize request. The server receives
// in the passed params the rootPath of the workspace plus the client capabilities.
_connection.onInitialize((params): InitializeResult => {
    _rootPath = params.rootPath || '';

    // Create a service instance for each of the workspace folders.
    if (params.workspaceFolders) {
        params.workspaceFolders.forEach(folder => {
            const path = _convertUriToPath(folder.uri);
            _workspaceMap.set(path, {
                workspaceName: folder.name,
                rootPath: path,
                rootUri: folder.uri,
                serviceInstance: _createAnalyzerService(folder.name),
                disableLanguageServices: false
            });
        });
    } else if (params.rootPath) {
        _workspaceMap.set(params.rootPath, {
            workspaceName: '',
            rootPath: params.rootPath,
            rootUri: '',
            serviceInstance: _createAnalyzerService(params.rootPath),
            disableLanguageServices: false
        });
    }

    _connection.console.log(`Fetching settings for workspace(s)`);
    updateSettingsForAllWorkspaces();

    return {
        capabilities: {
            // Tell the client that the server works in FULL text document
            // sync mode (as opposed to incremental).
            textDocumentSync: _documents.syncKind,
            definitionProvider: true,
            referencesProvider: true,
            documentSymbolProvider: true,
            workspaceSymbolProvider: true,
            hoverProvider: true,
            renameProvider: true,
            completionProvider: {
                triggerCharacters: ['.', '['],
                resolveProvider: true
            },
            signatureHelpProvider: {
                triggerCharacters: ['(', ',', ')']
            },
            codeActionProvider: {
                codeActionKinds: [
                    CodeActionKind.QuickFix,
                    CodeActionKind.SourceOrganizeImports
                ]
            }
        }
    };
});

function _getWorkspaceForFile(filePath: string): WorkspaceServiceInstance {
    let bestRootPath: string | undefined;
    let bestInstance: WorkspaceServiceInstance | undefined;

    _workspaceMap.forEach(workspace => {
        if (workspace.rootPath) {
            // Is the file is under this workspace folder?
            if (filePath.startsWith(workspace.rootPath)) {
                // Is this the fist candidate? If not, is this workspace folder
                // contained within the previous candidate folder? We always want
                // to select the innermost folder, since that overrides the
                // outer folders.
                if (bestRootPath === undefined || workspace.rootPath.startsWith(bestRootPath)) {
                    bestRootPath = workspace.rootPath;
                    bestInstance = workspace;
                }
            }
        }
    });

    // If there were multiple workspaces or we couldn't find any,
    // create a default one to use for this file.
    if (bestInstance === undefined) {
        let defaultWorkspace = _workspaceMap.get(_defaultWorkspacePath);
        if (!defaultWorkspace) {
            // If there is only one workspace, use that one.
            const workspaceNames = [..._workspaceMap.keys()];
            if (workspaceNames.length === 1) {
                return _workspaceMap.get(workspaceNames[0])!;
            }

            // Create a default workspace for files that are outside
            // of all workspaces.
            defaultWorkspace = {
                workspaceName: '',
                rootPath: '',
                rootUri: '',
                serviceInstance: _createAnalyzerService(_defaultWorkspacePath),
                disableLanguageServices: false
            };
            _workspaceMap.set(_defaultWorkspacePath, defaultWorkspace);
            updateSettingsForWorkspace(defaultWorkspace);
        }

        return defaultWorkspace;
    }

    return bestInstance;
}

_connection.onDidChangeConfiguration(() => {
    _connection.console.log(`Received updated settings`);
    updateSettingsForAllWorkspaces();
});

_connection.onCodeAction(params => {
    _recordUserInteractionTime();

    const sortImportsCodeAction = CodeAction.create(
        'Organize Imports', Command.create('Organize Imports', commandOrderImports),
        CodeActionKind.SourceOrganizeImports);
    const codeActions: CodeAction[] = [sortImportsCodeAction];

    const filePath = _convertUriToPath(params.textDocument.uri);
    const workspace = _getWorkspaceForFile(filePath);
    if (!workspace.disableLanguageServices) {
        const range: LineAndColumnRange = {
            start: {
                line: params.range.start.line,
                column: params.range.start.character
            },
            end: {
                line: params.range.end.line,
                column: params.range.end.character
            }
        };

        const diags = workspace.serviceInstance.getDiagnosticsForRange(filePath, range);
        const typeStubDiag = diags.find(d => {
            const actions = d.getActions();
            return actions && actions.find(a => a.action === commandCreateTypeStub);
        });

        if (typeStubDiag) {
            const action = typeStubDiag.getActions()!.find(
                a => a.action === commandCreateTypeStub) as CreateTypeStubFileAction;
            if (action) {
                const createTypeStubAction = CodeAction.create(
                    `Create Type Stub For ‘${ action.moduleName }’`,
                    Command.create('Create Type Stub', commandCreateTypeStub,
                        workspace.rootPath, action.moduleName),
                    CodeActionKind.QuickFix);
                codeActions.push(createTypeStubAction);
            }
        }

        const addOptionalDiag = diags.find(d => {
            const actions = d.getActions();
            return actions && actions.find(a => a.action === commandAddMissingOptionalToParam);
        });

        if (addOptionalDiag) {
            const action = addOptionalDiag.getActions()!.find(
                a => a.action === commandAddMissingOptionalToParam) as AddMissingOptionalToParamAction;
            if (action) {
                const addMissingOptionalAction = CodeAction.create(
                    `Add 'Optional' to type annotation`,
                    Command.create(`Add 'Optional' to type annotation`, commandAddMissingOptionalToParam,
                        action.offsetOfTypeNode),
                    CodeActionKind.QuickFix);
                codeActions.push(addMissingOptionalAction);
            }
        }
    }

    return codeActions;
});

_connection.onDefinition(params => {
    _recordUserInteractionTime();

    const filePath = _convertUriToPath(params.textDocument.uri);

    const position: LineAndColumn = {
        line: params.position.line,
        column: params.position.character
    };

    const workspace = _getWorkspaceForFile(filePath);
    if (workspace.disableLanguageServices) {
        return;
    }
    const locations = workspace.serviceInstance.getDefinitionForPosition(filePath, position);
    if (!locations) {
        return undefined;
    }
    return locations.map(loc =>
        Location.create(_convertPathToUri(loc.path), _convertRange(loc.range)));
});

_connection.onReferences(params => {
    const filePath = _convertUriToPath(params.textDocument.uri);

    const position: LineAndColumn = {
        line: params.position.line,
        column: params.position.character
    };

    const workspace = _getWorkspaceForFile(filePath);
    if (workspace.disableLanguageServices) {
        return;
    }
    const locations = workspace.serviceInstance.getReferencesForPosition(filePath, position,
        params.context.includeDeclaration);
    if (!locations) {
        return undefined;
    }
    return locations.map(loc =>
        Location.create(_convertPathToUri(loc.path), _convertRange(loc.range)));
});

_connection.onDocumentSymbol(params => {
    _recordUserInteractionTime();

    const filePath = _convertUriToPath(params.textDocument.uri);

    const workspace = _getWorkspaceForFile(filePath);
    if (workspace.disableLanguageServices) {
        return undefined;
    }

    const symbolList: DocumentSymbol[] = [];
    workspace.serviceInstance.addSymbolsForDocument(filePath, symbolList);
    return symbolList;
});

_connection.onWorkspaceSymbol(params => {
    const symbolList: SymbolInformation[] = [];

    _workspaceMap.forEach(workspace => {
        if (!workspace.disableLanguageServices) {
            workspace.serviceInstance.addSymbolsForWorkspace(
                symbolList, params.query);
        }
    });

    return symbolList;
});

_connection.onHover(params => {
    const filePath = _convertUriToPath(params.textDocument.uri);

    const position: LineAndColumn = {
        line: params.position.line,
        column: params.position.character
    };

    const workspace = _getWorkspaceForFile(filePath);
    const hoverResults = workspace.serviceInstance.getHoverForPosition(filePath, position);
    if (!hoverResults) {
        return undefined;
    }

    const markupString = hoverResults.parts.map(part => {
        if (part.python) {
            return '```python\n' + part.text + '\n```\n';
        }
        return part.text;
    }).join('');

    return {
        contents: {
            kind: MarkupKind.Markdown,
            value: markupString
        },
        range: _convertRange(hoverResults.range)
    };
});

_connection.onSignatureHelp(params => {
    const filePath = _convertUriToPath(params.textDocument.uri);

    const position: LineAndColumn = {
        line: params.position.line,
        column: params.position.character
    };

    const workspace = _getWorkspaceForFile(filePath);
    if (workspace.disableLanguageServices) {
        return;
    }
    const signatureHelpResults = workspace.serviceInstance.getSignatureHelpForPosition(
        filePath, position);
    if (!signatureHelpResults) {
        return undefined;
    }

    return {
        signatures: signatureHelpResults.signatures.map(sig => {
            let paramInfo: ParameterInformation[] = [];
            if (sig.parameters) {
                paramInfo = sig.parameters.map(param => {
                    return ParameterInformation.create(
                        [param.startOffset, param.endOffset], param.documentation);
                });
            }
            return SignatureInformation.create(sig.label, sig.documentation,
                ...paramInfo);
        }),
        activeSignature: signatureHelpResults.activeSignature !== undefined ?
            signatureHelpResults.activeSignature : null,
        activeParameter: signatureHelpResults.activeParameter !== undefined ?
            signatureHelpResults.activeParameter : null
    };
});

_connection.onCompletion(params => {
    const filePath = _convertUriToPath(params.textDocument.uri);

    const position: LineAndColumn = {
        line: params.position.line,
        column: params.position.character
    };

    const workspace = _getWorkspaceForFile(filePath);
    if (workspace.disableLanguageServices) {
        return;
    }

    const completions = workspace.serviceInstance.getCompletionsForPosition(
        filePath, position, workspace.rootPath);

    // Always mark as incomplete so we get called back when the
    // user continues typing. Without this, the editor will assume
    // that it has received a complete list and will filter that list
    // on its own.
    if (completions) {
        completions.isIncomplete = true;
    }

    return completions;
});

_connection.onCompletionResolve(params => {
    const completionItemData = params.data as CompletionItemData;
    if (completionItemData) {
        const workspace = _workspaceMap.get(completionItemData.workspacePath);
        if (workspace && completionItemData.filePath) {
            workspace.serviceInstance.resolveCompletionItem(
                completionItemData.filePath, params);
        }
    }
    return params;
});

_connection.onRenameRequest(params => {
    const filePath = _convertUriToPath(params.textDocument.uri);

    const position: LineAndColumn = {
        line: params.position.line,
        column: params.position.character
    };

    const workspace = _getWorkspaceForFile(filePath);
    if (workspace.disableLanguageServices) {
        return;
    }
    const editActions = workspace.serviceInstance.renameSymbolAtPosition(
        filePath, position, params.newName);

    if (!editActions) {
        return undefined;
    }

    const edits: WorkspaceEdit = {
        changes: {}
    };
    editActions.forEach(editAction => {
        const uri = _convertPathToUri(editAction.filePath);
        if (edits.changes![uri] === undefined) {
            edits.changes![uri] = [];
        }

        const textEdit: TextEdit = {
            range: _convertRange(editAction.range),
            newText: editAction.replacementText
        };
        edits.changes![uri].push(textEdit);
    });

    return edits;
});

_connection.onDidOpenTextDocument(params => {
    const filePath = _convertUriToPath(params.textDocument.uri);
    const service = _getWorkspaceForFile(filePath).serviceInstance;
    service.setFileOpened(
        filePath,
        params.textDocument.version,
        params.textDocument.text);
});

_connection.onDidChangeTextDocument(params => {
    _recordUserInteractionTime();

    const filePath = _convertUriToPath(params.textDocument.uri);
    const service = _getWorkspaceForFile(filePath).serviceInstance;
    service.updateOpenFileContents(
        filePath,
        params.textDocument.version,
        params.contentChanges[0].text);
});

_connection.onDidCloseTextDocument(params => {
    const filePath = _convertUriToPath(params.textDocument.uri);
    const service = _getWorkspaceForFile(filePath).serviceInstance;
    service.setFileClosed(filePath);
});

function getConfiguration(workspace: WorkspaceServiceInstance, sections: string[]) {
    const scopeUri = workspace.rootUri ? workspace.rootUri : undefined;
    return _connection.workspace.getConfiguration(
        sections.map(section => {
            return {
                scopeUri,
                section
            };
        })
    );
}

function updateSettingsForAllWorkspaces() {
    _workspaceMap.forEach(workspace => {
        updateSettingsForWorkspace(workspace);
    });
}

function fetchSettingsForWorkspace(workspace: WorkspaceServiceInstance,
    callback: (pythonSettings: PythonSettings, pyrightSettings: PyrightSettings) => void) {

    const pythonSettingsPromise = getConfiguration(workspace, ['python', 'pyright']);
    pythonSettingsPromise.then((settings: [PythonSettings, PyrightSettings]) => {
        callback(settings[0], settings[1]);
    }, () => {
        // An error occurred trying to read the settings
        // for this workspace, so ignore.
    });
}

function updateSettingsForWorkspace(workspace: WorkspaceServiceInstance) {
    fetchSettingsForWorkspace(workspace, (pythonSettings, pyrightSettings) => {
        updateOptionsAndRestartService(workspace, pythonSettings, pyrightSettings);

        workspace.disableLanguageServices = !!pyrightSettings.disableLanguageServices;
    });
}

function updateOptionsAndRestartService(workspace: WorkspaceServiceInstance,
    pythonSettings: PythonSettings, pyrightSettings?: PyrightSettings,
    typeStubTargetImportName?: string) {

    const commandLineOptions = new CommandLineOptions(workspace.rootPath, true);
    commandLineOptions.checkOnlyOpenFiles = pyrightSettings ?
        !!pyrightSettings.openFilesOnly : true;
    commandLineOptions.useLibraryCodeForTypes = pyrightSettings ?
        !!pyrightSettings.useLibraryCodeForTypes : false;

    // Disable watching of source files in the VS Code extension if we're
    // analyzing only open files. The file system watcher code has caused
    // lots of problems across multiple platforms. It provides little or
    // no benefit when we're in "openFilesOnly" mode.
    commandLineOptions.watch = !commandLineOptions.checkOnlyOpenFiles;

    if (pythonSettings.venvPath) {
        commandLineOptions.venvPath = combinePaths(workspace.rootPath || _rootPath,
            normalizePath(_expandPathVariables(pythonSettings.venvPath)));
    }

    if (pythonSettings.pythonPath) {
        // The Python VS Code extension treats the value "python" specially. This means
        // the local python interpreter should be used rather than interpreting the
        // setting value as a path to the interpreter. We'll simply ignore it in this case.
        if (pythonSettings.pythonPath.trim() !== 'python') {
            commandLineOptions.pythonPath = combinePaths(workspace.rootPath || _rootPath,
                normalizePath(_expandPathVariables(pythonSettings.pythonPath)));
        }
    }

    if (pythonSettings.analysis &&
        pythonSettings.analysis.typeshedPaths &&
        pythonSettings.analysis.typeshedPaths.length > 0) {

        // Pyright supports only one typeshed path currently, whereas the
        // official VS Code Python extension supports multiple typeshed paths.
        // We'll use the first one specified and ignore the rest.
        commandLineOptions.typeshedPath =
            _expandPathVariables(pythonSettings.analysis.typeshedPaths[0]);
    }

    if (typeStubTargetImportName) {
        commandLineOptions.typeStubTargetImportName = typeStubTargetImportName;
    }

    workspace.serviceInstance.setOptions(commandLineOptions);
}

_connection.onInitialized(() => {
    _connection.workspace.onDidChangeWorkspaceFolders(event => {
        event.removed.forEach(workspace => {
            const rootPath = _convertUriToPath(workspace.uri);
            _workspaceMap.delete(rootPath);
        });

        event.added.forEach(workspace => {
            const rootPath = _convertUriToPath(workspace.uri);
            const newWorkspace: WorkspaceServiceInstance = {
                workspaceName: workspace.name,
                rootPath,
                rootUri: workspace.uri,
                serviceInstance: _createAnalyzerService(workspace.name),
                disableLanguageServices: false
            };
            _workspaceMap.set(rootPath, newWorkspace);
            updateSettingsForWorkspace(newWorkspace);
        });
    });
});

_connection.onExecuteCommand((cmdParams: ExecuteCommandParams) => {
    if (cmdParams.command === commandOrderImports ||
        cmdParams.command === commandAddMissingOptionalToParam) {

        if (cmdParams.arguments && cmdParams.arguments.length >= 1) {
            const docUri = cmdParams.arguments[0];
            const otherArgs = cmdParams.arguments.slice(1);
            const filePath = _convertUriToPath(docUri);
            const workspace = _getWorkspaceForFile(filePath);
            const editActions = workspace.serviceInstance.performQuickAction(
                filePath, cmdParams.command, otherArgs);
            if (!editActions) {
                return [];
            }

            const edits: TextEdit[] = [];
            editActions.forEach(editAction => {
                edits.push({
                    range: _convertRange(editAction.range),
                    newText: editAction.replacementText
                });
            });

            return edits;
        }
    } else if (cmdParams.command === commandCreateTypeStub) {
        if (cmdParams.arguments && cmdParams.arguments.length >= 2) {
            const workspaceRoot = cmdParams.arguments[0];
            const importName = cmdParams.arguments[1];
            const promise = new Promise<void>((resolve, reject) => {
                const serviceInstance = _createTypeStubService(importName, success => {
                    if (success) {
                        _handlePostCreateTypeStub();
                        resolve();
                    } else {
                        reject();
                    }
                });

                // Allocate a temporary pseudo-workspace to perform this job.
                const workspace: WorkspaceServiceInstance = {
                    workspaceName: `Create Type Stub ${ importName }`,
                    rootPath: workspaceRoot,
                    rootUri: _convertPathToUri(workspaceRoot),
                    serviceInstance,
                    disableLanguageServices: true
                };

                fetchSettingsForWorkspace(workspace, (pythonSettings, pyrightSettings) => {
                    updateOptionsAndRestartService(workspace, pythonSettings, pyrightSettings, importName);
                });
            });

            return promise;
        }
    }

    return new ResponseError<string>(1, 'Unsupported command');
});

// Expands certain predefined variables supported within VS Code settings.
// Ideally, VS Code would provide an API for doing this expansion, but
// it doesn't. We'll handle the most common variables here as a convenience.
function _expandPathVariables(value: string): string {
    const regexp = /\$\{(.*?)\}/g;
    return value.replace(regexp, (match: string, name: string) => {
        const trimmedName = name.trim();
        if (trimmedName === 'workspaceFolder') {
            return _rootPath;
        }
        return match;
    });
}

function _convertDiagnostics(diags: AnalyzerDiagnostic[]): Diagnostic[] {
    return diags.map(diag => {
        const severity = diag.category === DiagnosticCategory.Error ?
            DiagnosticSeverity.Error : DiagnosticSeverity.Warning;

        let source = 'pyright';
        const rule = diag.getRule();
        if (rule) {
            source = `${ source } (${ rule })`;
        }

        const vsDiag = Diagnostic.create(_convertRange(diag.range), diag.message, severity,
            undefined, source);

        if (diag.category === DiagnosticCategory.UnusedCode) {
            vsDiag.tags = [DiagnosticTag.Unnecessary];
            vsDiag.severity = DiagnosticSeverity.Hint;
        }

        const relatedInfo = diag.getRelatedInfo();
        if (relatedInfo.length > 0) {
            vsDiag.relatedInformation = relatedInfo.map(info => {
                return DiagnosticRelatedInformation.create(
                    Location.create(_convertPathToUri(info.filePath),
                        _convertRange(info.range)),
                    info.message
                );
            });
        }

        return vsDiag;
    });
}

function _convertRange(range?: LineAndColumnRange): Range {
    if (!range) {
        return Range.create(_convertPosition(), _convertPosition());
    }
    return Range.create(_convertPosition(range.start), _convertPosition(range.end));
}

function _convertPosition(position?: LineAndColumn): Position {
    if (!position) {
        return Position.create(0, 0);
    }
    return Position.create(position.line, position.column);
}

function _convertUriToPath(uriString: string): string {
    const uri = URI.parse(uriString);
    let convertedPath = normalizePath(uri.path);

    // If this is a DOS-style path with a drive letter, remove
    // the leading slash.
    if (convertedPath.match(/^\\[a-zA-Z]:\\/)) {
        convertedPath = convertedPath.substr(1);
    }

    return convertedPath;
}

function _convertPathToUri(path: string): string {
    return URI.file(path).toString();
}

function _recordUserInteractionTime() {
    // Tell all of the services that the user is actively
    // interacting with one or more editors, so they should
    // back off from performing any work.
    _workspaceMap.forEach(workspace => {
        workspace.serviceInstance.recordUserInteractionTime();
    });
}

// Listen on the connection
_connection.listen();
