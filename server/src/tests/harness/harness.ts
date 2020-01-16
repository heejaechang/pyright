import * as io from "./io";

// * Review *
// it seems not good to have global variable, but might be not matter in js world?
// what is casing people use in typescript for global const?
export let IO: io.IO;

// harness always uses one kind of new line
// but note that `parseTestData` in `fourslash.ts` uses "\n"
export const harnessNewLine = "\r\n";

// root for file paths that are stored in a virtual file system
export const virtualFileSystemRoot = "/";

/** set io for current test hardness */
export function setHarnessIO(io: io.IO) {
    IO = io;
}
