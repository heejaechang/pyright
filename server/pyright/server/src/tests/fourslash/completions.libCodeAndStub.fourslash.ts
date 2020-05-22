/// <reference path="fourslash.ts" />

// @filename: mspythonconfig.json
//// {
////   "useLibraryCodeForTypes": true
//// }

// @filename: testLib/__init__.py
// @library: true
//// class Validator:
////     '''The validator class'''
////     def is_valid(self, text):
////         '''Checks if the input string is valid.'''
////         return True
////     @property
////     def validated(self):
////         '''The validated property.'''
////         return True

// @filename: testLib/__init__.pyi
// @library: true
//// class Validator:
////     def is_valid(self, text: str) -> bool: ...
////     @property
////     def validated(self) -> bool: ...

// @filename: test.py
//// import testLib
//// obj = testLib.[|/*marker1*/Validator|]()
//// obj.is[|/*marker2*/|]
//// obj.va[|/*marker3*/|]

// @ts-ignore
await helper.verifyCompletion('included', {
    marker1: {
        completions: [
            {
                label: 'Validator',
                documentation: {
                    kind: 'markdown',
                    value: '```python\nclass Validator()\n```\n---\nThe validator class',
                },
            },
        ],
    },
    marker2: {
        completions: [
            {
                label: 'is_valid',
                documentation: {
                    kind: 'markdown',
                    value:
                        '```python\nis_valid: (self: Validator, text: str) -> bool\n```\n---\nChecks if the input string is valid.',
                },
            },
        ],
    },
    marker3: {
        completions: [
            {
                label: 'validated',
                documentation: {
                    kind: 'markdown',
                    value: '```python\nvalidated: bool\n```\n---\nThe validated property.',
                },
            },
        ],
    },
});
