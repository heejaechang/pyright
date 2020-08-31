/*
 * nativeInit.ts
 *
 * Preparest platform-appropriate native binary
 * of the ONNX runtime for IntelliCode.
 */
import * as path from 'path';

import { FileSystem } from 'pyright-internal/common/fileSystem';

import { Platform } from '../common/platform';

const nativesRoot = 'native';
const onnxruntime = 'onnxruntime';

export function prepareNativesForCurrentPlatform(fs: FileSystem, platform: Platform): void {
    // .dll or .so must be next to .node file.
    // We need to copy appropriate one from
    // multi-platform folder
    // This is only needed when running from bundle.

    // File copying happens only in 'release' as in running from bundle.
    if (!platform.isBundle()) {
        return; // Regular structure, nothing to do.
    }
    if (!platform.isOnnxSupported()) {
        return; // ONNX is not supported on this platform.
    }

    try {
        const targetFolder = __dirname;
        // Other platforms may not have 'dll' extension.
        const onnxFiles = fs
            .readdirEntriesSync(targetFolder)
            .filter((f) => f.isFile && f.name.startsWith(onnxruntime) && path.extname(f.name) !== '.node');
        if (onnxFiles.length > 0) {
            return; // File already copied;
        }

        // node_modules/onnxruntime/napi-v3/{win32|darwin|linux}/x64
        const onnxBin = path.join(targetFolder, nativesRoot, onnxruntime, 'napi-v3', platform.getPlatformName(), 'x64');
        copyFiles(onnxBin, targetFolder, fs);
    } catch (e) {
        console.log(`Unable to prepare IntelliCode native binaries. Exception: ${e.message}`);
    }
}

function copyFiles(srcFolder: string, dstFolder: string, fs: FileSystem): void {
    const files = fs
        .readdirEntriesSync(srcFolder)
        .filter((f) => f.isFile)
        .map((f) => f.name);
    for (const f of files) {
        fs.copyFileSync(path.join(srcFolder, f), path.join(dstFolder, f));
    }
}
