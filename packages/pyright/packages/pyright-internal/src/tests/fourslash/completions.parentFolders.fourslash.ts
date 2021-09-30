/// <reference path="fourslash.ts" />

// @filename: module.py
//// # empty

// @filename: nested1/__init__.py
//// # empty

// @filename: nested1/module.py
//// # empty

// @filename: nested1/nested2/__init__.py
//// # empty

// @filename: nested1/nested2/test1.py
//// from .[|/*marker1*/|]

// @filename: nested1/nested2/test2.py
//// from ..[|/*marker2*/|]

{
    helper.openFiles(helper.getMarkers().map((m) => m.fileName));

    // @ts-ignore
    await helper.verifyCompletion('exact', 'markdown', {
        marker1: {
            completions: [
                { label: 'import', kind: Consts.CompletionItemKind.Keyword },
                { label: 'test1', kind: Consts.CompletionItemKind.Module },
                { label: 'test2', kind: Consts.CompletionItemKind.Module },
            ],
        },
        marker2: {
            completions: [
                { label: 'import', kind: Consts.CompletionItemKind.Keyword },
                { label: 'nested2', kind: Consts.CompletionItemKind.Module },
                { label: 'module', kind: Consts.CompletionItemKind.Module },
            ],
        },
    });
}
