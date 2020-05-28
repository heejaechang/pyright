/*
 * deepLearning.test.ts
 *
 * IntelliCode deep learning (ONNX) tests.
 */

import 'jest-extended';

import * as realFs from 'fs';
import { anyString, instance, mock, verify, when } from 'ts-mockito';

import { prepareNativesForCurrentPlatform } from '../../../intelliCode/nativeInit';
import { FileSystem } from '../../../pyright/server/src/common/fileSystem';
import { Platform } from '../../common/platform';

let mockedFs: FileSystem;
let mockedPlatform: Platform;

const onnxruntimeEntry: realFs.Dirent = {
    isFile: () => true,
    isDirectory: () => false,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isFIFO: () => false,
    isSocket: () => false,
    isSymbolicLink: () => false,
    name: 'onnxruntime.dll',
};

describe('IntelliCode native modules init', () => {
    beforeEach(() => {
        mockedFs = mock<FileSystem>();
        mockedPlatform = mock<Platform>();
    });

    test('not in a bundle', () => {
        prepareNativesForCurrentPlatform(instance(mockedFs), instance(mockedPlatform));

        verify(mockedPlatform.isBundle()).once();
        verify(mockedPlatform.isOnnxSupported()).never();
        verify(mockedFs.readdirEntriesSync(anyString())).never();
        verify(mockedFs.copyFileSync(anyString(), anyString())).never();
    });

    test('unsupported platform', () => {
        when(mockedPlatform.isBundle()).thenReturn(true);
        prepareNativesForCurrentPlatform(instance(mockedFs), instance(mockedPlatform));

        verify(mockedPlatform.isBundle()).once();
        verify(mockedPlatform.isOnnxSupported()).once();
        verify(mockedFs.readdirEntriesSync(anyString())).never();
        verify(mockedFs.copyFileSync(anyString(), anyString())).never();
    });

    test('modules already copied', () => {
        when(mockedPlatform.isBundle()).thenReturn(true);
        when(mockedPlatform.isOnnxSupported()).thenReturn(true);

        when(mockedFs.readdirEntriesSync(anyString())).thenReturn([onnxruntimeEntry]);

        prepareNativesForCurrentPlatform(instance(mockedFs), instance(mockedPlatform));

        verify(mockedPlatform.isBundle()).once();
        verify(mockedPlatform.isOnnxSupported()).once();
        verify(mockedFs.readdirEntriesSync(anyString())).once();
        verify(mockedFs.copyFileSync(anyString(), anyString())).never();
    });

    test('copy modules', () => {
        when(mockedPlatform.isBundle()).thenReturn(true);
        when(mockedPlatform.isOnnxSupported()).thenReturn(true);
        when(mockedPlatform.getPlatformName()).thenReturn('win32');

        let call = 1;
        when(mockedFs.readdirEntriesSync(anyString())).thenCall(() => {
            return call++ === 1 ? [] : [onnxruntimeEntry];
        });

        prepareNativesForCurrentPlatform(instance(mockedFs), instance(mockedPlatform));

        verify(mockedPlatform.isBundle()).once();
        verify(mockedPlatform.isOnnxSupported()).once();
        verify(mockedFs.readdirEntriesSync(anyString())).twice();
        verify(mockedFs.copyFileSync(anyString(), anyString())).once();
    });
});
