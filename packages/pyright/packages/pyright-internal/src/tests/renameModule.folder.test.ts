/*
 * renameModule.folder.test.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Tests Program.RenameModule
 */

import assert from 'assert';
import { CancellationToken } from 'vscode-languageserver';

import { combinePaths, getDirectoryPath } from '../common/pathUtils';
import { parseAndGetTestState } from './harness/fourslash/testState';
import { testRenameModule } from './renameModuleTestUtils';

test('folder move up', () => {
    const code = `
// @filename: nested/__init__.py
//// [|/*marker*/|]

// @filename: test1.py
//// from . import ([|nested|])
    `;

    const state = parseAndGetTestState(code).state;
    const path = getDirectoryPath(state.getMarkerByName('marker').fileName);

    const edits = state.program.renameModule(path, combinePaths(path, 'sub'), CancellationToken.None);
    assert(!edits);
});

test('folder move down', () => {
    const code = `
// @filename: nested/__init__.py
//// [|/*marker*/|]

// @filename: test1.py
//// from . import ([|nested|])
    `;

    const state = parseAndGetTestState(code).state;
    const path = getDirectoryPath(state.getMarkerByName('marker').fileName);

    const edits = state.program.renameModule(path, combinePaths(path, '..'), CancellationToken.None);
    assert(!edits);
});

test('simple folder rename - from import', () => {
    const code = `
// @filename: nested/__init__.py
//// [|/*marker*/|]
//// def foo():
////    pass

// @filename: test1.py
//// from . import ([|nested|])
//// [|nested|].foo()
    `;

    const state = parseAndGetTestState(code).state;
    const path = getDirectoryPath(state.getMarkerByName('marker').fileName);

    testRenameModule(state, path, `${combinePaths(path, '..', 'sub')}`, 'nested', 'sub');
});

test('simple folder rename - from ', () => {
    const code = `
// @filename: nested/__init__.py
//// [|/*marker*/|]
//// def foo():
////    pass

// @filename: test1.py
//// from [|nested|] import foo
    `;

    const state = parseAndGetTestState(code).state;
    const path = getDirectoryPath(state.getMarkerByName('marker').fileName);

    testRenameModule(state, path, `${combinePaths(path, '..', 'sub')}`, 'nested', 'sub');
});

test('simple folder rename - import ', () => {
    const code = `
// @filename: nested/__init__.py
//// [|/*marker*/|]
//// def foo():
////    pass

// @filename: test1.py
//// import [|nested|]
//// [|nested|].foo()
    `;

    const state = parseAndGetTestState(code).state;
    const path = getDirectoryPath(state.getMarkerByName('marker').fileName);

    testRenameModule(state, path, `${combinePaths(path, '..', 'sub')}`, 'nested', 'sub');
});

test('simple folder rename - import dotted name', () => {
    const code = `
// @filename: nested1/__init__.py
//// # empty

// @filename: nested1/nested2/__init__.py
//// [|/*marker*/|]
//// def foo():
////    pass

// @filename: test1.py
//// import nested1.[|nested2|]
//// nested1.[|nested2|].foo()
    `;

    const state = parseAndGetTestState(code).state;
    const path = getDirectoryPath(state.getMarkerByName('marker').fileName);

    testRenameModule(state, path, `${combinePaths(path, '..', 'sub')}`, 'nested2', 'sub');
});
