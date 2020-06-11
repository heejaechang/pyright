export interface LanguageServerFolder {
    path: string;
    version: string; // SemVer, in string form to avoid cross-extension type issues.
}

export interface LSExtensionApi {
    languageServerFolder?(): Promise<LanguageServerFolder>;
}
