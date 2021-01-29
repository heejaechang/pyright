/*
 * docStringConversion.test.ts
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT license.
 *
 * Tests for the Python doc string to markdown converter.
 */

import assert = require('assert');
import { convertDocStringToMarkdown, convertDocStringToPlainText } from '../analyzer/docStringConversion';

// For substitution in the test data strings
// Produces more readable test data than escaping the back ticks
const singleTick = '`';
const doubleTick = '``';
const tripleTick = '```';

test('PlaintextIndention', () => {
    const all: Array<Array<string>> = [
        ['A\nB', 'A\nB'],
        ['A\n\nB', 'A\n\nB'],
        ['A\n    B', 'A\nB'],
        ['    A\n    B', 'A\nB'],
        ['\nA\n    B', 'A\n    B'],
        ['\n    A\n    B', 'A\nB'],
        ['\nA\nB\n', 'A\nB'],
        ['  \n\nA \n    \nB  \n    ', 'A\n\nB'],
    ];

    all.forEach((v) => _testConvertToMarkdown(v[0], v[1]));
    all.forEach((v) => _testConvertToPlainText(v[0], v[1]));
});

test('NormalText', () => {
    const docstring = `This is just some normal text
that extends over multiple lines. This will appear
as-is without modification.
`;

    const markdown = `This is just some normal text
that extends over multiple lines. This will appear
as-is without modification.
`;

    _testConvertToMarkdown(docstring, markdown);
});

test('InlineLiterals', () => {
    const docstring =
        'This paragraph talks about ``foo``\n' +
        'which is related to :something:`bar`, and probably `qux`:something_else:.\n';

    const markdown = 'This paragraph talks about `foo`\n' + 'which is related to `bar`, and probably `qux`.\n';

    _testConvertToMarkdown(docstring, markdown);
});

test('Headings', () => {
    const docstring = `Heading 1
=========

Heading 2
---------

Heading 3
~~~~~~~~~

Heading 4
+++++++++
`;

    const markdown = `Heading 1
=========

Heading 2
---------

Heading 3
---------

Heading 4
---------
`;

    _testConvertToMarkdown(docstring, markdown);
});

test('AsterisksAtStartOfArgs', () => {
    const docstring = `Foo:

    Args:
        foo (Foo): Foo!
        *args: These are positional args.
        **kwargs: These are named args.
`;

    const markdown = `Foo:

Args:
    foo (Foo): Foo!
    \\*args: These are positional args.
    \\*\\*kwargs: These are named args.
`;

    _testConvertToMarkdown(docstring, markdown);
});

test('CopyrightAndLicense', () => {
    const docstring = `This is a test.

:copyright: Fake Name
:license: ABCv123
`;

    const markdown = `This is a test.

:copyright: Fake Name

:license: ABCv123
`;

    _testConvertToMarkdown(docstring, markdown);
});

test('CommonRestFieldLists', () => {
    const docstring = `This function does something.

:param foo: This is a description of the foo parameter
    which does something interesting.
:type foo: Foo
:param bar: This is a description of bar.
:type bar: Bar
:return: Something else.
:rtype: Something
:raises ValueError: If something goes wrong.
`;

    const markdown = `This function does something.

:param foo: This is a description of the foo parameter
    which does something interesting.

:type foo: Foo

:param bar: This is a description of bar.

:type bar: Bar

:return: Something else.

:rtype: Something

:raises ValueError: If something goes wrong.
`;

    _testConvertToMarkdown(docstring, markdown);
});

test('Doctest', () => {
    const docstring = `This is a doctest:

>>> print('foo')
foo
`;

    const markdown = `This is a doctest:

${tripleTick}
>>> print('foo')
foo
${tripleTick}
`;

    _testConvertToMarkdown(docstring, markdown);
});

test('DoctestIndented', () => {
    const docstring = `This is a doctest:

    >>> print('foo')
    foo
`;

    const markdown = `This is a doctest:

${tripleTick}
>>> print('foo')
foo
${tripleTick}
`;

    _testConvertToMarkdown(docstring, markdown);
});

test('DoctestTextAfter', () => {
    const docstring = `This is a doctest:

>>> print('foo')
foo

This text comes after.
`;

    const markdown = `This is a doctest:

${tripleTick}
>>> print('foo')
foo
${tripleTick}

This text comes after.
`;

    _testConvertToMarkdown(docstring, markdown);
});

test('DoctestIndentedTextAfter', () => {
    const docstring = `This is a doctest:

    >>> print('foo')
    foo
  This line has a different indent.
`;

    const markdown = `This is a doctest:

${tripleTick}
>>> print('foo')
foo
${tripleTick}

This line has a different indent.
`;

    _testConvertToMarkdown(docstring, markdown);
});

test('MarkdownStyleBacktickBlock', () => {
    const docstring = `Backtick block:

${tripleTick}
print(foo_bar)

if True:
    print(bar_foo)
${tripleTick}

And some text after.
`;

    const markdown = `Backtick block:

${tripleTick}
print(foo_bar)

if True:
    print(bar_foo)
${tripleTick}

And some text after.
`;

    _testConvertToMarkdown(docstring, markdown);
});

test('RestLiteralBlock', () => {
    const docstring = `
Take a look at this code::

    if foo:
        print(foo)
    else:
        print('not foo!')

This text comes after.
`;

    const markdown = `Take a look at this code:

${tripleTick}
if foo:
    print(foo)
else:
    print('not foo!')
${tripleTick}

This text comes after.
`;

    _testConvertToMarkdown(docstring, markdown);
});

test('RestLiteralBlockEmptyDoubleColonLine', () => {
    const docstring = `
::

    if foo:
        print(foo)
    else:
        print('not foo!')
`;

    const markdown = `${tripleTick}
if foo:
    print(foo)
else:
    print('not foo!')
${tripleTick}
`;

    _testConvertToMarkdown(docstring, markdown);
});

test('RestLiteralBlockExtraSpace', () => {
    const docstring = `
Take a look at this code::




    if foo:
        print(foo)
    else:
        print('not foo!')

This text comes after.
`;

    const markdown = `Take a look at this code:

${tripleTick}
if foo:
    print(foo)
else:
    print('not foo!')
${tripleTick}

This text comes after.
`;

    _testConvertToMarkdown(docstring, markdown);
});

test('RestLiteralBlockNoIndentOneLiner', () => {
    const docstring = `
The next code is a one-liner::

print(a + foo + 123)

And now it's text.
`;

    const markdown = `The next code is a one-liner:

${tripleTick}
print(a + foo + 123)
${tripleTick}

And now it's text.
`;

    _testConvertToMarkdown(docstring, markdown);
});

test('DirectiveRemoval', () => {
    const docstring = `This is a test.

.. ignoreme:: example

This text is in-between.

.. versionadded:: 1.0
    Foo was added to Bar.

.. admonition:: Note
    
    This paragraph appears inside the admonition
    and spans multiple lines.

This text comes after.
`;

    const markdown = `This is a test.

This text is in-between.

This text comes after.
`;

    _testConvertToMarkdown(docstring, markdown);
});

test('ClassDirective', () => {
    const docstring = `
.. class:: FooBar()
    This is a description of ${doubleTick}FooBar${doubleTick}.

${doubleTick}FooBar${doubleTick} is interesting.
`;

    const markdown = `${tripleTick}
FooBar()
${tripleTick}

This is a description of ${singleTick}FooBar${singleTick}.

${singleTick}FooBar${singleTick} is interesting.
`;

    _testConvertToMarkdown(docstring, markdown);
});

test('UnfinishedBacktickBlock', () => {
    const docstring = '```\nsomething\n';

    const markdown = '```\nsomething\n```\n';

    _testConvertToMarkdown(docstring, markdown);
});

test('UnfinishedInlineLiteral', () => {
    const docstring = '`oops\n';

    const markdown = '`oops`';

    _testConvertToMarkdown(docstring, markdown);
});

test('DashList', () => {
    const docstring = `
This is a list:
  - Item 1
  - Item 2
`;

    const markdown = `This is a list:
  - Item 1
  - Item 2
`;

    _testConvertToMarkdown(docstring, markdown);
});

test('AsteriskList', () => {
    const docstring = `
This is a list:
  * Item 1
  * Item 2
`;

    const markdown = `This is a list:
  * Item 1
  * Item 2
`;

    _testConvertToMarkdown(docstring, markdown);
});

test('SquareBrackets', () => {
    const docstring = 'Optional[List[str]]';
    const markdown = 'Optional\\[List\\[str\\]\\]';

    _testConvertToMarkdown(docstring, markdown);
});

test('ListDashMultiline', () => {
    const docstring = `Keyword Arguments:

    - option_strings -- A list of command-line option strings which
        should be associated with this action.

    - dest -- The name of the attribute to hold the created object(s)
`;

    const markdown = `Keyword Arguments:

- option\\_strings -- A list of command-line option strings which
should be associated with this action.

- dest -- The name of the attribute to hold the created object(s)`;

    _testConvertToMarkdown(docstring, markdown);
});

test('HalfIndentOnLeadingDash', () => {
    const docstring = `Dash List
- foo
    - foo
- bar
     - baz
- qux
    - aaa
    `;

    const markdown = `Dash List
- foo
  - foo
- bar
  - baz
- qux
  - aaa`;

    _testConvertToMarkdown(docstring, markdown);
});

test('AsteriskMultilineList', () => {
    const docstring = `
This is a list:
    * this is a long, multi-line paragraph. It
      seems to go on and on.

    * this is a long, multi-line paragraph. It
      seems to go on and on.
`;

    const markdown = `This is a list:
  * this is a long, multi-line paragraph. It
seems to go on and on.

  * this is a long, multi-line paragraph. It
seems to go on and on.
`;

    _testConvertToMarkdown(docstring, markdown);
});

test('ListAsteriskAddLeadingSpace', () => {
    const docstring = `Title
* First line bullet, no leading space
  with second line.
* Second line bullet, no leading space
  with second line.`;

    const markdown = `Title
 * First line bullet, no leading space
with second line.
 * Second line bullet, no leading space
with second line.`;

    _testConvertToMarkdown(docstring, markdown);
});

test('PandasReadCsvListIndent', () => {
    const docstring = `Title
keep_default_na : bool, default True
    Whether or not to include the default NaN values when parsing the data.

    * If \`keep_default_na\` is True, and \`na_values\` are specified, \`na_values\`
        is appended to the default NaN values used for parsing.   

na_filter : bool, default True`;

    const markdown = `Title
keep\\_default\\_na : bool, default True
    Whether or not to include the default NaN values when parsing the data.

  * If \`keep_default_na\` is True, and \`na_values\` are specified, \`na_values\`
is appended to the default NaN values used for parsing.

na\\_filter : bool, default True`;

    _testConvertToMarkdown(docstring, markdown);
});

function _testConvertToMarkdown(docstring: string, expectedMarkdown: string) {
    const actualMarkdown = convertDocStringToMarkdown(docstring);

    assert.equal(_normalizeLineEndings(actualMarkdown).trim(), _normalizeLineEndings(expectedMarkdown).trim());
}

function _testConvertToPlainText(docstring: string, expectedPlainText: string) {
    const actualMarkdown = convertDocStringToPlainText(docstring);

    assert.equal(_normalizeLineEndings(actualMarkdown).trim(), _normalizeLineEndings(expectedPlainText).trim());
}

function _normalizeLineEndings(text: string): string {
    return text.split(/\r?\n/).join('\n');
}
