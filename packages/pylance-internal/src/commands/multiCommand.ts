import { Command } from 'vscode-languageserver';

import { Commands } from './commands';

interface MultiCommand extends Command {
    command: Commands.runCommands;
    arguments: Command[];
}

function isMultiCommand(c: Command): c is MultiCommand {
    return c.command === Commands.runCommands;
}

export function mergeCommands(...commands: (Command | undefined)[]): Command | undefined {
    const args: Command[] = [];

    commands.forEach((c) => {
        if (c) {
            if (isMultiCommand(c)) {
                args.push(...c.arguments);
            } else {
                args.push(c);
            }
        }
    });

    if (args.length === 0) {
        return undefined;
    }

    if (args.length === 1) {
        return args[0];
    }

    return {
        title: '',
        command: Commands.runCommands,
        arguments: args,
    };
}
