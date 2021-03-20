/// <reference path="fourslash.ts" />

// @filename: docstrings.py
//// print([|/*marker1*/|])

// @filename: typeshed-fallback/stdlib/builtins.py
//// # There is no easy way to run builtin scrapper in test. so just check
//// # whether source mapper exists.
////
//// def print():
////     """source mapper mapped"""
////     pass
{
    helper.verifySignature('plaintext', {
        marker1: {
            signatures: [
                {
                    label:
                        '(*values: object, sep: str | None = ..., end: str | None = ..., file: SupportsWrite[str] | None = ..., flush: bool = ...) -> None',
                    parameters: [
                        '*values: object',
                        'sep: str | None = ...',
                        'end: str | None = ...',
                        'file: SupportsWrite[str] | None = ...',
                        'flush: bool = ...',
                    ],
                    documentation: 'source mapper mapped',
                },
            ],
            activeParameters: [0],
        },
    });

    helper.verifySignature('markdown', {
        marker1: {
            signatures: [
                {
                    label:
                        '(*values: object, sep: str | None = ..., end: str | None = ..., file: SupportsWrite[str] | None = ..., flush: bool = ...) -> None',
                    parameters: [
                        '*values: object',
                        'sep: str | None = ...',
                        'end: str | None = ...',
                        'file: SupportsWrite[str] | None = ...',
                        'flush: bool = ...',
                    ],
                    documentation: 'source mapper mapped',
                },
            ],
            activeParameters: [0],
        },
    });
}
