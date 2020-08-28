/// <reference path="../../../pyright/server/src/tests/fourslash/fourslash.ts" />
// @indexer: true

// @filename: test1.py
//// os[|/*marker1*/|]

// @filename: test2.py
//// sys[|/*marker2*/|]

helper.openFile('/test1.py');

// @ts-ignore
await helper.verifyCompletion('included', {
    marker1: {
        completions: [
            {
                label: 'os',
                documentation: {
                    kind: 'markdown',
                    value: 'Auto-import\n\n```\nimport os\n```',
                },
            },
        ],
    },
});

helper.openFile('/test2.py');

// @ts-ignore
await helper.verifyCompletion('included', {
    marker2: {
        completions: [
            {
                label: 'sys',
                documentation: {
                    kind: 'markdown',
                    value: 'Auto-import\n\n```\nimport sys\n```',
                },
            },
        ],
    },
});
