/*
 * deepLearning.test.ts
 *
 * IntelliCode deep learning (ONNX) tests.
 */

import 'jest-extended';

import * as fs from 'fs';
import { CancellationToken } from 'vscode-languageserver';

import { Platform } from '../../common/platform';
import { AssignmentWalker } from '../../intelliCode/assignmentWalker';
import { DeepLearning } from '../../intelliCode/deepLearning';
import { ExpressionWalker } from '../../intelliCode/expressionWalker';
import { ModelLoader } from '../../intelliCode/modelLoader';
import { realZipOpener } from '../../intelliCode/zip';
import { getRealModel, parseCode } from './testUtils';

const platform = new Platform();

const modelZipPath = getRealModel();

describe('IntelliCode deep learning', () => {
    if (!platform.isOnnxSupported()) {
        return;
    }

    let deepLearning: DeepLearning;

    beforeAll(async () => {
        const loader = new ModelLoader(realZipOpener());

        const model = await loader.loadModel(modelZipPath);
        expect(model).toBeDefined();
        expect(model!.model).toBeDefined();
        expect(model!.model.length).toBe(35756058);

        deepLearning = new DeepLearning(model!, platform);
        await deepLearning.initialize();
    });

    let testFn = test;

    // To run the tests, download the IC model zip manually and place it at data/realModel.zip.
    // Otherwise, this test is skipped.
    if (!fs.existsSync(modelZipPath)) {
        testFn = test.skip;
    }

    testFn(
        'simple string',
        async () => {
            const code = `
s = 'str'
s. `;
            const pr = parseCode(code);
            const aw = new AssignmentWalker(pr.parseTree);
            aw.walk(pr.parseTree);
            const ew = new ExpressionWalker(aw.scopes);
            ew.walk(pr.parseTree);

            const r = await deepLearning.getRecommendations(pr, ew, code.length - 1, CancellationToken.None);
            expect(r.recommendations).toContain(['format', 'join', 'replace']);
        },
        60000
    );
});
