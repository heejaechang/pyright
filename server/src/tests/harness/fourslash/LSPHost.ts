import { SortedMap } from "../utils";

export interface LanguageServiceAdapter {
    getHost(): LanguageServiceAdapterHost;
    getLanguageService(): ts.LanguageService;
    getClassifier(): ts.Classifier;
    getPreProcessedFileInfo(fileName: string, fileContents: string): ts.PreProcessedFileInfo;
}

export abstract class LanguageServiceAdapterHost {
    public readonly sys = new fakes.System(new vfs.FileSystem(/*ignoreCase*/ true, { cwd: virtualFileSystemRoot }));
    public typesRegistry: Map<string, void> | undefined;
    private scriptInfos: SortedMap<string, ScriptInfo>;

    constructor(protected cancellationToken = DefaultHostCancellationToken.instance,
        protected settings = ts.getDefaultCompilerOptions()) {
        this.scriptInfos = new SortedMap({ comparer: this.vfs.stringComparer, sort: "insertion" });
    }

    public get vfs() {
        return this.sys.vfs;
    }

    public getNewLine(): string {
        return harnessNewLine;
    }

    public getFilenames(): string[] {
        const fileNames: string[] = [];
        this.scriptInfos.forEach(scriptInfo => {
            if (scriptInfo.isRootFile) {
                // only include root files here
                // usually it means that we won't include lib.d.ts in the list of root files so it won't mess the computation of compilation root dir.
                fileNames.push(scriptInfo.fileName);
            }
        });
        return fileNames;
    }

    public getScriptInfo(fileName: string): ScriptInfo | undefined {
        return this.scriptInfos.get(vpath.resolve(this.vfs.cwd(), fileName));
    }

    public addScript(fileName: string, content: string, isRootFile: boolean): void {
        this.vfs.mkdirpSync(vpath.dirname(fileName));
        this.vfs.writeFileSync(fileName, content);
        this.scriptInfos.set(vpath.resolve(this.vfs.cwd(), fileName), new ScriptInfo(fileName, content, isRootFile));
    }

    public renameFileOrDirectory(oldPath: string, newPath: string): void {
        this.vfs.mkdirpSync(ts.getDirectoryPath(newPath));
        this.vfs.renameSync(oldPath, newPath);

        const updater = ts.getPathUpdater(oldPath, newPath, ts.createGetCanonicalFileName(this.useCaseSensitiveFileNames()), /*sourceMapper*/ undefined);
        this.scriptInfos.forEach((scriptInfo, key) => {
            const newFileName = updater(key);
            if (newFileName !== undefined) {
                this.scriptInfos.delete(key);
                this.scriptInfos.set(newFileName, scriptInfo);
                scriptInfo.fileName = newFileName;
            }
        });
    }

    public editScript(fileName: string, start: number, end: number, newText: string) {
        const script = this.getScriptInfo(fileName);
        if (script) {
            script.editContent(start, end, newText);
            this.vfs.mkdirpSync(vpath.dirname(fileName));
            this.vfs.writeFileSync(fileName, script.content);
            return;
        }

        throw new Error("No script with name '" + fileName + "'");
    }

    public openFile(_fileName: string, _content?: string, _scriptKindName?: string): void { /*overridden*/ }

    /**
     * @param line 0 based index
     * @param col 0 based index
     */
    public positionToLineAndCharacter(fileName: string, position: number): ts.LineAndCharacter {
        const script: ScriptInfo = this.getScriptInfo(fileName)!;
        assert.isOk(script);
        return ts.computeLineAndCharacterOfPosition(script.getLineMap(), position);
    }

    public lineAndCharacterToPosition(fileName: string, lineAndCharacter: ts.LineAndCharacter): number {
        const script: ScriptInfo = this.getScriptInfo(fileName)!;
        assert.isOk(script);
        return ts.computePositionOfLineAndCharacter(script.getLineMap(), lineAndCharacter.line, lineAndCharacter.character);
    }

    useCaseSensitiveFileNames() {
        return !this.vfs.ignoreCase;
    }
}