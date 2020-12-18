// Copyright (c) Microsoft Corporation. All rights reserved.

import * as fs from 'fs';
import * as path from 'path';

import { DiagnosticRule } from 'pyright-internal/common/diagnosticRules';

describe('Diagnostic overrides', () => {
    test('Compare DiagnosticRule to package.json', () => {
        const extensionRoot = path.resolve(__dirname, '..', '..', '..', 'vscode-pylance');
        const packageJson = path.join(extensionRoot, 'package.json');
        const jsonString = fs.readFileSync(packageJson, { encoding: 'utf-8' });
        const json = JSON.parse(jsonString);

        expect(json.contributes?.configuration?.properties).toBeDefined();
        const overrides = json.contributes?.configuration?.properties['python.analysis.diagnosticSeverityOverrides'];
        expect(overrides).toBeDefined();
        const props = overrides.properties;
        expect(props).toBeDefined();

        const overrideNamesInJson = Object.keys(props);
        for (const propName of overrideNamesInJson) {
            const p = props[propName];

            expect(p.type).toEqual('string');
            expect(p.description).toBeDefined();
            expect(p.description.length).toBeGreaterThan(0);
            expect(p.default).toBeDefined();

            expect(p.enum).toBeDefined();
            expect(Array.isArray(p.enum));
            expect(p.enum).toHaveLength(4);

            expect(p.enum[0]).toEqual('none');
            expect(p.enum[1]).toEqual('information');
            expect(p.enum[2]).toEqual('warning');
            expect(p.enum[3]).toEqual('error');

            expect(p.enum).toContain(p.default);
        }

        const overrideNamesInCode: string[] = Object.values(DiagnosticRule).filter((x) => x.startsWith('report'));

        for (const n of overrideNamesInJson) {
            expect(overrideNamesInCode).toContain(n);
        }
        for (const n of overrideNamesInCode) {
            expect(overrideNamesInJson).toContain(n);
        }
    });
});
