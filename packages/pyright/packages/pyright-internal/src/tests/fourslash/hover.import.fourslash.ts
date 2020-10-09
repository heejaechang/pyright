/// <reference path="fourslash.ts" />

// @filename: test.py
//// import [|/*marker*/library|]

// @filename: library/__init__.py
//// '''documentation for library'''

helper.verifyHover('markdown', {
    marker: { value: '```python\n(module) library\n```\ndocumentation for library' },
});
