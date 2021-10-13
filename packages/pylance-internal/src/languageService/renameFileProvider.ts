import { CancellationToken, RenameFile, RenameFilesParams, WorkspaceEdit } from 'vscode-languageserver';

import { createImportedModuleDescriptor, supportedFileExtensions } from 'pyright-internal/analyzer/importResolver';
import { AnalyzerService } from 'pyright-internal/analyzer/service';
import { isStubFile } from 'pyright-internal/analyzer/sourceMapper';
import { FileEditAction } from 'pyright-internal/common/editAction';
import {
    changeAnyExtension,
    convertPathToUri,
    convertUriToPath,
    ensureTrailingDirectorySeparator,
    getDirectoryChangeKind,
    getFileExtension,
    isDirectory,
    isFile,
} from 'pyright-internal/common/pathUtils';
import { convertWorkspaceDocumentEdits } from 'pyright-internal/common/workspaceEditUtils';
import { LanguageServerInterface, WorkspaceServiceInstance } from 'pyright-internal/languageServerBase';
import { Localizer } from 'pyright-internal/localization/localize';

import { TelemetryEvent, TelemetryEventName, TelemetryInterface } from '../common/telemetry';

export class RenameFileProvider {
    static async renameFiles(
        ls: LanguageServerInterface,
        telemetry: TelemetryInterface,
        cmdParams: RenameFilesParams,
        token: CancellationToken
    ): Promise<WorkspaceEdit | null> {
        const provider = new RenameFileProvider(ls, telemetry);
        return provider._renameFiles(cmdParams, token);
    }

    constructor(private _ls: LanguageServerInterface, private _telemetry: TelemetryInterface) {}

    private async _renameFiles(cmdParams: RenameFilesParams, token: CancellationToken): Promise<WorkspaceEdit | null> {
        if (cmdParams.files.length !== 1) {
            // We only support renaming 1 file at a time since file rename on filesystem and LSP call happens concurrently.
            // If text is changed inside of a file that got renamed as well we can't support those nested case for now.
            return null;
        }

        if (!this._ls.supportAdvancedEdits) {
            // Client doesn't support capabilities needed for this command.
            return null;
        }

        const args = cmdParams.files[0];
        const oldPath = convertUriToPath(this._ls.fs, args.oldUri);
        const newPath = convertUriToPath(this._ls.fs, args.newUri);

        // Old and new are same
        if (oldPath === newPath) {
            return null;
        }

        let renameType = 'unknown';
        let edits: WorkspaceEdit | null = null;

        if (isFile(this._ls.fs, oldPath)) {
            renameType = 'file';
            edits = await this._executeFileRename(oldPath, newPath, token);
        } else if (isDirectory(this._ls.fs, oldPath)) {
            // We only support rename for directory yet.
            renameType = 'folder';
            edits = await this._executeDirectoryRename(oldPath, newPath, token);
        }

        this._sendTelemetry(renameType, edits);
        return (edits?.documentChanges?.length ?? 0) > 0 ? edits : null;
    }

    private async _executeDirectoryRename(oldDirectory: string, newDirectory: string, token: CancellationToken) {
        if (getDirectoryChangeKind(this._ls.fs, oldDirectory, newDirectory) !== 'Renamed') {
            return null;
        }

        // Rename can't change workspace it belongs to.
        const oldWorkspace = await this._ls.getWorkspaceForFile(oldDirectory);
        const newWorkspace = await this._ls.getWorkspaceForFile(newDirectory);
        if (oldWorkspace !== newWorkspace || !newWorkspace.rootPath) {
            return null;
        }

        const service = newWorkspace.serviceInstance;
        const edits = service.renameModule(oldDirectory, newDirectory, token);
        if (edits === undefined) {
            return null;
        }

        const oldDirectoryName = this._getNameRelativeToRoot(oldWorkspace, oldDirectory);
        const newDirectoryName = this._getNameRelativeToRoot(newWorkspace, newDirectory);

        return this._constructWorkspaceEdits(oldDirectoryName, newDirectoryName, edits);
    }

    private async _executeFileRename(oldFile: string, newFile: string, token: CancellationToken) {
        // We don't support renaming extension.
        const oldExt = getFileExtension(oldFile);
        const newExt = getFileExtension(newFile);
        if (oldExt !== newExt) {
            return null;
        }

        // We only support renaming supported files.
        if (!supportedFileExtensions.some((e) => e === newExt)) {
            return null;
        }

        // Rename can't change workspace it belongs to.
        const oldWorkspace = await this._ls.getWorkspaceForFile(oldFile);
        const newWorkspace = await this._ls.getWorkspaceForFile(newFile);
        if (oldWorkspace !== newWorkspace || !newWorkspace.rootPath) {
            return null;
        }

        const service = newWorkspace.serviceInstance;

        // Only support user file rename.
        const oldTracked = service.isTracked(oldFile);
        const newTracked = service.isTracked(newFile);
        if (oldTracked !== newTracked || !newTracked) {
            return null;
        }

        if (newExt === '.py' && !this._getStubAndFilePairInfo(service, newFile)) {
            // If a stub exists for new file, we don't do rename.
            return null;
        }

        const info = this._getStubAndFilePairInfo(service, oldFile);
        const fileToRename = info?.stubFile ?? info?.pythonFile;
        if (!fileToRename) {
            // We don't know which file we need to rename.
            return null;
        }

        // In case we need to rename python file since stub file is renamed, and python file
        // is left behind, make sure we can actually rename python file. otherwise, don't do
        // refactoring.
        if (info!.stubFile && info!.pythonFile) {
            const newPythonFile = changeAnyExtension(newFile, 'py');
            if (this._ls.fs.existsSync(newPythonFile)) {
                // We can't rename python file, don't do refactoring.
                return null;
            }
        }

        const edits = service.renameModule(oldFile, newFile, token);
        if (edits === undefined) {
            return null;
        }

        const oldModuleName = this._getNameRelativeToRoot(oldWorkspace, oldFile);
        const newModuleName = this._getNameRelativeToRoot(newWorkspace, newFile);

        const workspaceEdits = this._constructWorkspaceEdits(oldModuleName, newModuleName, edits);

        // Add rename event
        if (info!.stubFile && info!.pythonFile) {
            // It looks like vscode UI doesn't support rename file confirmation.
            workspaceEdits.changeAnnotations!['fileRename'] = {
                label: Localizer.Refactoring.moveFileLabel().format({ oldModuleName, newModuleName }),
                description: Localizer.Refactoring.moveFileDescription().format({ oldModuleName, newModuleName }),
                needsConfirmation: false,
            };

            workspaceEdits.documentChanges?.push(
                RenameFile.create(
                    convertPathToUri(this._ls.fs, info!.pythonFile),
                    convertPathToUri(this._ls.fs, changeAnyExtension(newFile, 'py')),
                    { ignoreIfExists: true },
                    'fileRename'
                )
            );
        }

        return workspaceEdits;
    }

    private _getNameRelativeToRoot(workspace: WorkspaceServiceInstance, path: string) {
        return path.substr(ensureTrailingDirectorySeparator(workspace.rootPath).length);
    }

    private _constructWorkspaceEdits(oldName: string, newName: string, edits: FileEditAction[]) {
        // Create change annotation
        const formatArgument = { oldModuleName: oldName, newModuleName: newName };
        const textEditAnnotation = {
            label: Localizer.Refactoring.moveFileLabel().format(formatArgument),
            description: Localizer.Refactoring.moveFileDescription().format(formatArgument),
            needsConfirmation: false,
        };

        // Convert oldFileName to newFileName
        return convertWorkspaceDocumentEdits(this._ls.fs, edits, { textEdit: textEditAnnotation }, 'textEdit');
    }

    private _getStubAndFilePairInfo(
        service: AnalyzerService,
        file: string
    ): { stubFile?: string; pythonFile?: string } | undefined {
        const execEnvironment = service.getConfigOptions().findExecEnvironment(file);
        if (!execEnvironment.root) {
            return undefined;
        }

        const nameAndType = service.getImportResolver().getModuleNameForImport(file, execEnvironment);
        if (!nameAndType.moduleName) {
            return undefined;
        }

        const stubFile = isStubFile(file) ? file : undefined;
        const pythonFile = stubFile ? undefined : file;
        const importResult = service
            .getImportResolver()
            .resolveImport(file, execEnvironment, createImportedModuleDescriptor(nameAndType.moduleName));
        if (!importResult.isImportFound) {
            // No corresponding file exists.
            return { stubFile, pythonFile };
        }

        const resolvedPath = importResult.resolvedPaths[importResult.resolvedPaths.length - 1];
        if (!resolvedPath.startsWith(execEnvironment.root)) {
            // It got resolved to a some random lib outside of the workspace or itself.
            // Consider it as no corresponding file existing.
            return { stubFile, pythonFile };
        }

        // Resolved to self.
        if (file === resolvedPath) {
            // If stub file is resolved to itself, find matching python file.
            if (stubFile) {
                if (importResult.nonStubImportResult?.isImportFound) {
                    // Find matching python file if there is one.
                    const matchingPythonFile =
                        importResult.nonStubImportResult.resolvedPaths[
                            importResult.nonStubImportResult.resolvedPaths.length - 1
                        ];
                    return { stubFile, pythonFile: matchingPythonFile };
                }

                return { stubFile, pythonFile };
            }

            // If python file is resolved to itself, then, no stub file exists, so go ahead.
            if (pythonFile) {
                return { stubFile, pythonFile };
            }
        }

        // It looks like there is a conflict where another file is picked up for the same module name.
        // For now, don't allow rename at this situation.
        if ((stubFile && importResult.isStubFile) || (pythonFile && !importResult.isStubFile)) {
            return undefined;
        }

        // For now, we don't do rename when python file is renamed when stub file exists.
        if (pythonFile && importResult.isStubFile) {
            return undefined;
        }

        return { stubFile, pythonFile: resolvedPath };
    }

    private _sendTelemetry(renameType: string, edits: WorkspaceEdit | null) {
        const event = new TelemetryEvent(TelemetryEventName.RENAME_FILES);

        event.Properties['type'] = renameType;
        if (edits?.documentChanges) {
            event.Measurements['affectedFilesCount'] = edits.documentChanges.length;
        }

        if (renameType === 'file') {
            event.Properties['fileRenamed'] = edits?.changeAnnotations?.['fileRename'] ? 'true' : 'false';
        }

        this._telemetry.sendTelemetry(event);
    }
}
