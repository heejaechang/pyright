import assert from 'assert';
import { Command } from 'vscode-languageserver';

import { Commands } from '../commands/commands';
import { mergeCommands } from '../commands/multiCommand';

describe('mergeCommands', () => {
    const commandA: Command = {
        title: 'command A',
        command: 'test.command.a',
        arguments: ['foo', 'bar', 1234],
    };

    const commandB: Command = {
        title: 'command B',
        command: 'test.command.b',
        arguments: [],
    };

    const commandC: Command = {
        title: 'command C',
        command: 'test.command.c',
        arguments: ['this is a test'],
    };

    test('no commands', () => {
        const got = mergeCommands();
        assert.strictEqual(got, undefined);
    });

    test('undefined commands', () => {
        const got = mergeCommands(undefined, undefined);
        assert.strictEqual(got, undefined);
    });

    test('single command', () => {
        const got = mergeCommands(commandA, undefined);
        assert.strictEqual(got, commandA);
    });

    test('single command reversed', () => {
        const got = mergeCommands(undefined, commandA);
        assert.strictEqual(got, commandA);
    });

    test('two commands', () => {
        const got = mergeCommands(commandA, commandB);
        assert.deepStrictEqual<Command>(got, {
            title: '',
            command: Commands.runCommands,
            arguments: [commandA, commandB],
        });
    });

    test('three commands', () => {
        const got = mergeCommands(commandA, commandB, commandC);
        assert.deepStrictEqual<Command>(got, {
            title: '',
            command: Commands.runCommands,
            arguments: [commandA, commandB, commandC],
        });
    });

    test('chained left', () => {
        const got = mergeCommands(mergeCommands(commandA, commandB), commandC);
        assert.deepStrictEqual<Command>(got, {
            title: '',
            command: Commands.runCommands,
            arguments: [commandA, commandB, commandC],
        });
    });

    test('chained right', () => {
        const got = mergeCommands(commandA, mergeCommands(commandB, commandC));
        assert.deepStrictEqual<Command>(got, {
            title: '',
            command: Commands.runCommands,
            arguments: [commandA, commandB, commandC],
        });
    });
});
