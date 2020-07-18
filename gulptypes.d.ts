declare module 'git-describe' {
    export interface GitInfo {
        raw: string;
        dirty: boolean;
        hash: string;
        distance: number | null;
        tag: string | null;
        semver: SemVer | null;
        suffix: string;
        semverString: string | null;
    }

    export async function gitDescribe(
        directory: string,
        options?: {
            dirtyMark?: string;
            dirtySemver?: boolean;
            longSemver?: boolean;
            reqireAnnotated?: boolean;
            match?: string;
            customArguments?: string[];
        }
    ): Promise<GitInfo>;
}
