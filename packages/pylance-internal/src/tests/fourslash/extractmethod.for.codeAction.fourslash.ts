/// <reference path="fourslash.ts" />

// @filename: test.py
//// [|/*marker*/some_very_long_variable_forcing_a_line_break = []
////
//// for variable in [
////     some_very_long_variable_forcing_a_line_break
////     for some_very_long_variable_forcing_a_line_break in some_very_long_variable_forcing_a_line_break
////     if some_very_long_variable_forcing_a_line_break == 1
//// ]:
////     pass|]

//@ts-ignore
await helper.verifyExtractMethod('marker', {
    ['file:///test.py']: [
        `def new_func():
    some_very_long_variable_forcing_a_line_break = []
    for variable in [
    some_very_long_variable_forcing_a_line_break
    for some_very_long_variable_forcing_a_line_break in some_very_long_variable_forcing_a_line_break
    if some_very_long_variable_forcing_a_line_break == 1
]:
        pass

`,
        'new_func()',
    ],
});
