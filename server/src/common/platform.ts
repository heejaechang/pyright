/*
 * platform.ts
 *
 * Definitions of platform service.
 */

import * as path from 'path';

export class Platform {
    isMac(): boolean {
        return process.platform === 'darwin';
    }
    isLinux(): boolean {
        return process.platform === 'linux';
    }
    isWindows(): boolean {
        return process.platform === 'win32';
    }
    is64(): boolean {
        return process.arch === 'x64';
    }
    getPlatformName(): string {
        return process.platform;
    }

    isOnnxSupported(): boolean {
        return (this.isWindows() || this.isMac() || this.isLinux()) && this.is64();
    }

    isBundle(): boolean {
        return path.basename(__filename) === 'server.bundle.js';
    }
}
