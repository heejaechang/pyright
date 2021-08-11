/*
 * pylanceFullAccessHost.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Implementation of host where it is allowed to run external executables.
 */

import * as child_process from 'child_process';

import { FileSystem } from 'pyright-internal/common/fileSystem';
import { FullAccessHost } from 'pyright-internal/common/fullAccessHost';
import { HostKind } from 'pyright-internal/common/host';
import { resolvePaths } from 'pyright-internal/common/pathUtils';

export class PylanceFullAccessHost extends FullAccessHost {
    static override createHost(kind: HostKind, fs: FileSystem) {
        return kind === HostKind.FullAccess ? new PylanceFullAccessHost(fs) : FullAccessHost.createHost(kind, fs);
    }

    constructor(fs: FileSystem) {
        super(fs);
    }

    scrapeModuleFromPython(moduleName: string, pythonPath: string): string | false {
        const commandLineArgs: string[] = [
            '-W',
            'ignore', // Don't print warnings to stderr.
            '-B', // Disable generating .pyc caches.
            '-S', // Disable the site module.
            '-I', // Enable "isolated mode", which disables PYTHON* variables, ensures the cwd isn't in sys.path, etc. Python 3.4+
            resolvePaths(this._fs.getModulePath(), 'scripts', 'scrape_module.py'),
            moduleName,
        ];

        const output = child_process.execFileSync(pythonPath, commandLineArgs, {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
            timeout: 10000,
        });

        if (!output) {
            return false;
        }

        return output;
    }
}
