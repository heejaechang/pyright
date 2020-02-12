/*
 * fourslashrunner.test.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 * 
 * Entry point that will read all *.fourslash.ts files and
 * register jest tests for them and run
 */
import * as path from "path";
import * as host from "../../pyright/server/src/tests/harness/host";
import { normalizeSlashes, combinePaths, resolvePaths } from "../../pyright/server/src/common/pathUtils";
import { runFourSlashTest } from "../../pyright/server/src/tests/harness/fourslash/runner";
import { srcFolder } from "../../pyright/server/src/tests/harness/vfs/factory";
import { createPyrxImportResolver } from "../../pyrxImportResolver";
import { MODULE_PATH } from "../../pyright/server/src/tests/harness/vfs/filesystem";

describe("pyrx fourslash tests", () => {
    const testFiles: string[] = [];

    const basePath = path.resolve(path.dirname(module.filename), "fourslash/");
    for (const file of host.HOST.listFiles(basePath, /.*\.fourslash\.ts$/i, { recursive: true })) {
        testFiles.push(file);
    }

    const mountedPaths = new Map<string, string>();
    const bundledStubsFolder = combinePaths(MODULE_PATH, normalizeSlashes('bundled-stubs'));
    const bundledStubsFolderPath = resolvePaths(host.HOST.getWorkspaceRoot(), '../../bundled-stubs');
    if (bundledStubsFolder && bundledStubsFolderPath) {
        mountedPaths.set(bundledStubsFolder, bundledStubsFolderPath);
    }

    testFiles.forEach(file => {
        describe(file, () => {
            const fn = normalizeSlashes(file);
            const justName = fn.replace(/^.*[\\/]/, "");

            it("fourslash test " + justName + " runs correctly", () => {
                runFourSlashTest(srcFolder, fn, mountedPaths, createPyrxImportResolver);
            });
        });
    });
});