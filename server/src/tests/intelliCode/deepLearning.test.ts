/*
 * deepLearning.test.ts
 *
 * IntelliCode deep learning (ONNX) tests.
 */

import 'jest-extended';

import * as path from 'path';
import { instance, mock, when } from 'ts-mockito';
import { CancellationToken } from 'vscode-languageserver';

import { DeepLearning } from '../../../intelliCode/deepLearning';
import { ExpressionWalker } from '../../../intelliCode/expressionWalker';
import { ModelLoader } from '../../../intelliCode/modelLoader';
import {
    ModelFileName,
    ModelMetaDataFileName,
    ModelTokensFileName,
    ModelZipAcquisitionService,
    ModelZipFileName,
} from '../../../intelliCode/models';
import { Zip } from '../../../intelliCode/zip';
import { createFromRealFileSystem } from '../../../pyright/server/src/common/fileSystem';
import { Platform } from '../../common/platform';
import { clientServerModelLocation, parseCode, walkAssignments } from './testUtils';

const platform = new Platform();

let deepLearning: DeepLearning;
let modelZipFolderPath: string | undefined;

describe('IntelliCode deep learning', () => {
    beforeAll(async () => {
        const fs = createFromRealFileSystem();
        const mockedZip = mock<Zip>();
        const loader = new ModelLoader(fs, instance(mockedZip));

        const mas = mock<ModelZipAcquisitionService>();
        modelZipFolderPath = path.join(__dirname, '../../../intelliCode/model');

        if (!fs.existsSync(path.join(modelZipFolderPath, ModelZipFileName))) {
            modelZipFolderPath = undefined;
            return;
        }
        // TODO: remove when ONNX is available on other platforms.
        if (!platform.isOnnxSupported()) {
            modelZipFolderPath = undefined;
            return;
        }

        when(mas.getModel()).thenReturn(Promise.resolve(modelZipFolderPath));

        const modelUnpackFolder = path.join(__dirname, clientServerModelLocation);
        expect(fs.existsSync(path.join(modelUnpackFolder, ModelFileName)));
        expect(fs.existsSync(path.join(modelUnpackFolder, ModelMetaDataFileName)));
        expect(fs.existsSync(path.join(modelUnpackFolder, ModelTokensFileName)));

        const model = await loader.loadModel(instance(mas), modelUnpackFolder);
        expect(model).toBeDefined();

        deepLearning = new DeepLearning(model!, platform);
        await deepLearning.initialize();
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
