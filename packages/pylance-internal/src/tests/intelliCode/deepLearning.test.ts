/*
 * deepLearning.test.ts
 *
 * IntelliCode deep learning (ONNX) tests.
 */

import 'jest-extended';

import * as path from 'path';
import { DirResult, dirSync } from 'tmp';
import { instance, mock } from 'ts-mockito';
import { CancellationToken, WorkDoneProgress } from 'vscode-languageserver';

import { createFromRealFileSystem } from 'pyright-internal/common/fileSystem';

import { Platform } from '../../common/platform';
import { DeepLearning } from '../../intelliCode/deepLearning';
import { ExpressionWalker } from '../../intelliCode/expressionWalker';
import { ModelLoader } from '../../intelliCode/modelLoader';
import { ModelFileName, ModelMetaDataFileName, ModelTokensFileName, ModelZipFileName } from '../../intelliCode/models';
import { Zip } from '../../intelliCode/zip';
import { parseCode, walkAssignments } from './testUtils';

const platform = new Platform();

let deepLearning: DeepLearning;
let modelZipFolderPath: string | undefined;
let modelUnpackFolderTmp: DirResult;
let modelUnpackFolder: string;

describe('IntelliCode deep learning', () => {
    // TODO: These tests don't run.

    beforeAll(async () => {
        const fs = createFromRealFileSystem();
        const mockedZip = mock<Zip>();
        const loader = new ModelLoader(fs, instance(mockedZip));
        modelZipFolderPath = path.resolve(__dirname, 'data');

        const modelZipPath = path.join(modelZipFolderPath, ModelZipFileName);
        if (!fs.existsSync(modelZipPath)) {
            modelZipFolderPath = undefined;
            return;
        }
        // TODO: remove when ONNX is available on other platforms.
        if (!platform.isOnnxSupported()) {
            modelZipFolderPath = undefined;
            return;
        }

        modelUnpackFolderTmp = dirSync({
            unsafeCleanup: true,
        });
        modelUnpackFolder = modelUnpackFolderTmp.name;

        const model = await loader.loadModel(modelZipPath, modelUnpackFolder);
        expect(model).toBeDefined();

        expect(fs.existsSync(path.join(modelUnpackFolder, ModelFileName)));
        expect(fs.existsSync(path.join(modelUnpackFolder, ModelMetaDataFileName)));
        expect(fs.existsSync(path.join(modelUnpackFolder, ModelTokensFileName)));

        deepLearning = new DeepLearning(model!, platform);
        await deepLearning.initialize();
    });

    afterAll(() => {
        modelUnpackFolderTmp.removeCallback();
    });

    if (!modelZipFolderPath) {
        test.skip('simple string', async () => await test_simpleString());
    } else {
        // Long timeout since model has to be downloaded.
        test('simple string', async () => await test_simpleString(), 60000);
    }

    async function test_simpleString(): Promise<void> {
        const code = `
s = 'str'
s. `;
        const pr = parseCode(code);
        const aw = walkAssignments(code);
        aw.walk(pr.parseTree);
        const ew = new ExpressionWalker(aw.scopes);
        ew.walk(pr.parseTree);

        const r = await deepLearning.getRecommendations(
            code,
            pr.parseTree,
            ew,
            code.length - 1,
            CancellationToken.None
        );
        expect(r).toContain(['join', 'replace', 'length']);
    }
});
