/// <reference path="fourslash.ts" />

// @filename: foo/bar.py
//// print("Test")

// @filename: mods/nested/__init__.py
//// print("Test")

// @filename: mods/nested/submod.py
//// print("Test")

// @filename: test.py
//// import [|/*barImport*/bar|]
//// from [|/*nestedImport*/nested|] import xyz
//// import [|/*initImport*/__init__|]
//// import [|/*nestedSubmodImport*/nested.submod|]
//// import [|/*submodImport*/submod|]
////
//// _ = bar
//// _ = xyz
//// _ = __init__
//// _ = nested.submod
//// _ = submod

{
    // @ts-ignore
    await helper.verifyCodeActions({
        barImport: {
            codeActions: [
                {
                    title: 'Add "./foo" to extraPaths',
                    kind: Consts.CodeActionKind.QuickFix,
                    command: {
                        title: 'Add "./foo" to extraPaths',
                        command: 'pylance.addToExtraPaths',
                        arguments: ['\\test.py', './foo'],
                    },
                },
            ],
        },
        nestedImport: {
            codeActions: [
                {
                    title: 'Add "./mods" to extraPaths',
                    kind: Consts.CodeActionKind.QuickFix,
                    command: {
                        title: 'Add "./mods" to extraPaths',
                        command: 'pylance.addToExtraPaths',
                        arguments: ['\\test.py', './mods'],
                    },
                },
            ],
        },
        initImport: {
            codeActions: [],
        },
        nestedSubmodImport: {
            codeActions: [
                {
                    title: 'Add "./mods" to extraPaths',
                    kind: Consts.CodeActionKind.QuickFix,
                    command: {
                        title: 'Add "./mods" to extraPaths',
                        command: 'pylance.addToExtraPaths',
                        arguments: ['\\test.py', './mods'],
                    },
                },
            ],
        },
        submodImport: {
            codeActions: [
                {
                    title: 'Add "./mods/nested" to extraPaths',
                    kind: Consts.CodeActionKind.QuickFix,
                    command: {
                        title: 'Add "./mods/nested" to extraPaths',
                        command: 'pylance.addToExtraPaths',
                        arguments: ['\\test.py', './mods/nested'],
                    },
                },
            ],
        },
    });
}
