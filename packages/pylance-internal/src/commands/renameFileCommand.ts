import { CancellationToken, ExecuteCommandParams, RenameFile, WorkspaceEdit } from 'vscode-languageserver';

import { createImportedModuleDescriptor, supportedFileExtensions } from 'pyright-internal/analyzer/importResolver';
import { AnalyzerService } from 'pyright-internal/analyzer/service';
import { isStubFile } from 'pyright-internal/analyzer/sourceMapper';
import { ServerCommand } from 'pyright-internal/commands/commandController';
import { throwIfCancellationRequested } from 'pyright-internal/common/cancellationUtils';
import { FileEditAction } from 'pyright-internal/common/editAction';
import { FileSystem } from 'pyright-internal/common/fileSystem';
import {
    changeAnyExtension,
    combinePaths,
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
import { AnalyzerServiceExecutor } from 'pyright-internal/languageService/analyzerServiceExecutor';
import { Localizer } from 'pyright-internal/localization/localize';
import { ReadOnlyAugmentedFileSystem } from 'pyright-internal/readonlyAugmentedFileSystem';

interface FileRenameArg {
    oldUri: string;
    newUri: string;
}

namespace FileRenameArg {
    export function is(value: any): value is FileRenameArg {
        const args = value as FileRenameArg;
        if (!args) {
            return false;
        }

        return !!args.oldUri && !!args.newUri;
    }
}

export class RenameFileCommand implements ServerCommand {
    constructor(private _ls: LanguageServerInterface) {}

    async execute(cmdParams: ExecuteCommandParams, token: CancellationToken): Promise<WorkspaceEdit | undefined> {
        if (!cmdParams.arguments || cmdParams.arguments.length === 0) {
            // We expects only 1 (or 2 for testing) argument for this command.
            return undefined;
        }

        const renameArgs = cmdParams.arguments[0];
        if (!Array.isArray(renameArgs) || renameArgs.length !== 1 || !FileRenameArg.is(renameArgs[0])) {
            // We only support renaming 1 file at a time since file rename on filesystem and LSP call happens concurrently.
            // If text is changed inside of a file that got renamed as well we can't support those nested case for now.
            return undefined;
        }

        const inTest = cmdParams.arguments.length > 1;
        if (!inTest && !this._ls.supportAdvancedEdits) {
            // Client doesn't support capabilities needed for this command.
            return undefined;
        }

        const args = renameArgs[0];
        const oldPath = convertUriToPath(this._ls.fs, args.oldUri);
        const newPath = convertUriToPath(this._ls.fs, args.newUri);

        // Old and new are same
        if (oldPath === newPath) {
            return undefined;
        }

        if (isFile(this._ls.fs, newPath)) {
            return await this._executeFileRename(oldPath, newPath, inTest, token);
        } else if (isDirectory(this._ls.fs, newPath)) {
            // We only support rename for directory yet.
            return await this._executeDirectoryRename(oldPath, newPath, inTest, token);
        }

        return undefined;
    }

    private async _executeDirectoryRename(
        oldDirectory: string,
        newDirectory: string,
        inTest: boolean,
        token: CancellationToken
    ) {
        if (getDirectoryChangeKind(this._ls.fs, oldDirectory, newDirectory) !== 'Renamed') {
            return undefined;
        }

        // Rename can't change workspace it belongs to.
        const oldWorkspace = await this._ls.getWorkspaceForFile(oldDirectory);
        const newWorkspace = await this._ls.getWorkspaceForFile(newDirectory);
        if (oldWorkspace !== newWorkspace || !newWorkspace.rootPath) {
            return undefined;
        }

        const oldDirectoryName = this._getNameRelativeToRoot(oldWorkspace, oldDirectory);
        const newDirectoryName = this._getNameRelativeToRoot(newWorkspace, newDirectory);
        if (!(await this._askUserConfirmation(oldDirectoryName, newDirectoryName, inTest, token))) {
            return undefined;
        }

        // Create new service to do analysis. Existing service can have a race depending on
        // when folder change is picked up.
        const fileSystem = new MoveFileSystem(this._ls.fs, token);

        // Put old folder back so that we can do rename on refactorService
        fileSystem.moveFolderSync(newDirectory, oldDirectory);

        const refactorService = await AnalyzerServiceExecutor.cloneService(
            this._ls,
            newWorkspace,
            /*typeStubTargetImportName*/ undefined,
            /*backgroundAnalysis*/ undefined,
            fileSystem
        );

        // For any file belongs to the new folder, move back to the old folder.
        const service = newWorkspace.serviceInstance;
        for (const opened of service.backgroundAnalysisProgram.program.getOpened()) {
            const sourceFile = opened.sourceFile;
            const filePath = sourceFile.getFilePath();
            if (!filePath.startsWith(newDirectory)) {
                continue;
            }

            const version = sourceFile.getClientVersion();
            if (version !== undefined) {
                refactorService.setFileClosed(filePath);
                refactorService.setFileOpened(
                    fileSystem.convertToOldPath(oldDirectory, newDirectory, filePath),
                    version,
                    sourceFile!.getOpenFileContents()!
                );
            }
        }

        const edits = refactorService.renameModule(oldDirectory, newDirectory, token);
        if (edits === undefined) {
            return undefined;
        }

        return this._constructWorkspaceEdits(oldDirectoryName, newDirectoryName, edits, fileSystem);
    }

    private async _executeFileRename(oldFile: string, newFile: string, inTest: boolean, token: CancellationToken) {
        // We don't support renaming extension.
        const oldExt = getFileExtension(oldFile);
        const newExt = getFileExtension(newFile);
        if (oldExt !== newExt) {
            return undefined;
        }

        // We only support renaming supported files.
        if (!supportedFileExtensions.some((e) => e === newExt)) {
            return undefined;
        }

        // Rename can't change workspace it belongs to.
        const oldWorkspace = await this._ls.getWorkspaceForFile(oldFile);
        const newWorkspace = await this._ls.getWorkspaceForFile(newFile);
        if (oldWorkspace !== newWorkspace || !newWorkspace.rootPath) {
            return undefined;
        }

        const service = newWorkspace.serviceInstance;

        // Only support user file rename.
        const oldTracked = service.isTracked(oldFile);
        const newTracked = service.isTracked(newFile);
        if (oldTracked !== newTracked || !newTracked) {
            return undefined;
        }

        // Create new service to do analysis. Existing service can have a race depending on
        // when file change is picked up.
        const fileSystem = new MoveFileSystem(this._ls.fs, token);
        const refactorService = await AnalyzerServiceExecutor.cloneService(
            this._ls,
            newWorkspace,
            /*typeStubTargetImportName*/ undefined,
            /*backgroundAnalysis*/ undefined,
            fileSystem
        );

        if (newExt === '.py' && !this._getStubAndFilePairInfo(refactorService, newFile)) {
            // If a stub exists for new file, we don't do rename.
            return undefined;
        }

        const info = this._getStubAndFilePairInfo(refactorService, oldFile);
        const fileToRename = info?.stubFile ?? info?.pythonFile;
        if (!fileToRename) {
            // We don't know which file we need to rename.
            return undefined;
        }

        // In case we need to rename python file since stub file is renamed, and python file
        // is left behind, make sure we can actually rename python file. otherwise, don't do
        // refactoring.
        if (info!.stubFile && info!.pythonFile) {
            const newPythonFile = changeAnyExtension(newFile, 'py');
            if (this._ls.fs.existsSync(newPythonFile)) {
                // We can't rename python file, don't do refactoring.
                return undefined;
            }
        }

        const oldModuleName = this._getNameRelativeToRoot(oldWorkspace, oldFile);
        const newModuleName = this._getNameRelativeToRoot(newWorkspace, newFile);
        if (!(await this._askUserConfirmation(oldModuleName, newModuleName, inTest, token))) {
            return undefined;
        }

        // Put old file back so that we can do rename on refactorService
        fileSystem.moveFileSync(newFile, oldFile);

        // If new file is opened, then close it and open the old file.
        const sourceFile = service.backgroundAnalysisProgram.program.getSourceFile(newFile);
        const version = sourceFile?.getClientVersion();
        if (version !== undefined) {
            refactorService.setFileClosed(newFile);
            refactorService.setFileOpened(oldFile, version, sourceFile!.getOpenFileContents()!);
        }

        // Refresh refactorService so that it can pick up file move changes.
        refactorService.invalidateAndForceReanalysis(
            /*rebuildLibraryIndexing*/ false,
            /* updateTrackedFilesList */ true
        );

        const edits = refactorService.renameModule(oldFile, newFile, token);
        if (edits === undefined) {
            return undefined;
        }

        const workspaceEdits = this._constructWorkspaceEdits(oldModuleName, newModuleName, edits, fileSystem);

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

    private _constructWorkspaceEdits(oldName: string, newName: string, edits: FileEditAction[], fs: MoveFileSystem) {
        // Create change annotation
        const formatArgument = { oldModuleName: oldName, newModuleName: newName };
        const textEditAnnotation = {
            label: Localizer.Refactoring.moveFileLabel().format(formatArgument),
            description: Localizer.Refactoring.moveFileDescription().format(formatArgument),
            needsConfirmation: true,
        };

        // Convert oldFileName to newFileName
        return convertWorkspaceDocumentEdits(
            this._ls.fs,
            edits.map((e) => {
                const original = fs.getOriginalFilePath(e.filePath);
                if (e.filePath !== original) {
                    e.filePath = original;
                }

                return e;
            }),
            { textEdit: textEditAnnotation },
            'textEdit'
        );
    }

    private async _askUserConfirmation(oldName: string, newName: string, inTest: boolean, token: CancellationToken) {
        if (inTest) {
            return true;
        }

        const prompt = await this._ls.window.showErrorMessage(
            Localizer.Refactoring.moveFile().format({ oldModuleName: oldName, newModuleName: newName }),
            { title: 'Yes', id: 'Yes' },
            { title: 'No', id: 'No' }
        );

        // These 2 checks will make sure we don't run 2 commands at the same time.
        // It can happen due to the "await" above.
        throwIfCancellationRequested(token);
        if (!prompt || prompt.id === 'No') {
            return false;
        }

        return true;
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
        if (resolvedPath === file || !resolvedPath.startsWith(execEnvironment.root)) {
            // It got resolved to a some random lib outside of the workspace or itself.
            // Consider it as no corresponding file existing.
            return { stubFile, pythonFile };
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
}

class MoveFileSystem extends ReadOnlyAugmentedFileSystem {
    constructor(delegateeFS: FileSystem, private _cancellationToken: CancellationToken) {
        super(delegateeFS);
    }

    moveFileSync(real: string, fake: string) {
        this._recordMovedEntry(fake, real);
    }

    moveFolderSync(real: string, fake: string) {
        this._recordMovedEntry(fake, real, /*reversible*/ true, /*isFile*/ false);
        this._moveFilesRecursive(real, fake, real);
    }

    convertToOldPath(oldPath: string, newPath: string, filePath: string) {
        return combinePaths(oldPath, filePath.substr(ensureTrailingDirectorySeparator(newPath).length));
    }

    private _moveFilesRecursive(real: string, fake: string, basePath: string) {
        throwIfCancellationRequested(this._cancellationToken);

        for (const current of this._realFS.readdirEntriesSync(basePath)) {
            const currentPath = combinePaths(basePath, current.name);

            this._recordMovedEntry(
                this.convertToOldPath(fake, real, currentPath),
                currentPath,
                /*reversible*/ true,
                current.isFile()
            );

            if (current.isDirectory()) {
                this._moveFilesRecursive(real, fake, currentPath);
            }
        }
    }
}
