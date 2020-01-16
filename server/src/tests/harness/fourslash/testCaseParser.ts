import { splitContentByNewlines } from "../utils";
import { getFileName } from "../../../common/pathUtils";

export namespace TestCaseParser {
    /** all the necessary information to set the right compiler settings */
    export interface CompilerSettings {
        [name: string]: string;
    }

    /** All the necessary information to turn a multi file test into useful units for later compilation */
    export interface TestUnitData {
        content: string;
        name: string;
        fileOptions: any;
        originalFilePath: string;
        references: string[];
    }

    // Regex for parsing options in the format "@Alpha: Value of any sort"
    const optionRegex = /^[\/]{2}\s*@(\w+)\s*:\s*([^\r\n]*)/gm;  // multiple matches on multiple lines

    export function extractCompilerSettings(content: string): CompilerSettings {
        const opts: CompilerSettings = {};

        let match: RegExpExecArray | null;
        while ((match = optionRegex.exec(content)) !== null) { // eslint-disable-line no-null/no-null
            opts[match[1]] = match[2].trim();
        }

        return opts;
    }

    export interface TestCaseContent {
        settings: CompilerSettings;
        testUnitData: TestUnitData[];
    }

    /** Given a test file containing // @FileName directives, return an array of named units of code to be added to an existing compiler instance */
    export function makeUnitsFromTest(code: string, fileName: string, rootDir?: string, settings = extractCompilerSettings(code)): TestCaseContent {
        // List of all the subfiles we've parsed out
        const testUnitData: TestUnitData[] = [];

        const lines = splitContentByNewlines(code);

        // Stuff related to the subfile we're parsing
        let currentFileContent: string | undefined;
        let currentFileOptions: any = {};
        let currentFileName: any;
        let refs: string[] = [];

        for (const line of lines) {
            let testMetaData: RegExpExecArray | null;
            if (testMetaData = optionRegex.exec(line)) {
                // Comment line, check for global/file @options and record them
                optionRegex.lastIndex = 0;
                const metaDataName = testMetaData[1].toLowerCase();
                currentFileOptions[testMetaData[1]] = testMetaData[2].trim();
                if (metaDataName !== "filename") {
                    continue;
                }

                // New metadata statement after having collected some code to go with the previous metadata
                if (currentFileName) {
                    // Store result file
                    const newTestFile = {
                        content: currentFileContent!, // TODO: GH#18217
                        name: currentFileName,
                        fileOptions: currentFileOptions,
                        originalFilePath: fileName,
                        references: refs
                    };
                    testUnitData.push(newTestFile);

                    // Reset local data
                    currentFileContent = undefined;
                    currentFileOptions = {};
                    currentFileName = testMetaData[2].trim();
                    refs = [];
                }
                else {
                    // First metadata marker in the file
                    currentFileName = testMetaData[2].trim();
                }
            }
            else {
                // Subfile content line
                // Append to the current subfile content, inserting a newline needed
                if (currentFileContent === undefined) {
                    currentFileContent = "";
                }
                else if (currentFileContent !== "") {
                    // End-of-line
                    currentFileContent = currentFileContent + "\n";
                }
                currentFileContent = currentFileContent + line;
            }
        }

        // normalize the fileName for the single file case
        currentFileName = testUnitData.length > 0 || currentFileName ? currentFileName : getFileName(fileName);

        // EOF, push whatever remains
        const newTestFile2 = {
            content: currentFileContent || "",
            name: currentFileName,
            fileOptions: currentFileOptions,
            originalFilePath: fileName,
            references: refs
        };
        testUnitData.push(newTestFile2);

        return { settings, testUnitData };
    }
}