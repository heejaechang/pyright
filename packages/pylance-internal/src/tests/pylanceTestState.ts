import assert from 'assert';
import {
    CancellationToken,
    Command,
    CompletionItem,
    SemanticTokens,
    SemanticTokensClientCapabilities,
    SemanticTokensLegend,
    TextDocumentEdit,
    TokenFormat,
    WorkspaceEdit,
} from 'vscode-languageserver';

import { isArray } from 'pyright-internal/common/core';
import { Range as PositionRange } from 'pyright-internal/common/textRange';
import { FourSlashData, Range } from 'pyright-internal/tests/harness/fourslash/fourSlashTypes';
import { TestLanguageService } from 'pyright-internal/tests/harness/fourslash/testLanguageService';
import { HostSpecificFeatures, TestState } from 'pyright-internal/tests/harness/fourslash/testState';
//import * as host from 'pyright-internal/tests/harness/host';
import { stringify } from 'pyright-internal/tests/harness/utils';

import { TelemetryEventInterface, TelemetryInterface } from '../common/telemetry';
import { RenameFileProvider } from '../languageService/renameFileProvider';
import { getSemanticTokens, SemanticTokenProvider } from '../languageService/semanticTokenProvider';
import { updateInsertTextForAutoParensIfNeeded } from '../server';

export interface DecodedSemanticToken {
    line: number;
    char: number;
    length: number;
    type: string;
    modifiers: string[];
}

export class PylanceTestState extends TestState {
    constructor(
        basePath: string,
        testData: FourSlashData,
        mountPaths?: Map<string, string>,
        hostSpecificFeatures?: HostSpecificFeatures
    ) {
        super(basePath, testData, mountPaths, hostSpecificFeatures);
    }

    async verifyExtractVariable(marker: string, edits: string[]): Promise<any> {
        const filename = this.getMarkerByName(marker).fileName;
        const range = this.getPositionRange(marker);
        const command = {
            title: 'Extract Variable',
            command: 'pylance.extractVariable',
            arguments: [filename, range],
        };

        return await this.verifyPylanceCommand(command, edits);
    }

    async verifyExtractMethod(marker: string, edits: string[]): Promise<any> {
        const filename = this.getMarkerByName(marker).fileName;
        const range = this.getPositionRange(marker);
        const command = {
            title: 'Extract method',
            command: 'pylance.extractMethod',
            arguments: [filename, range],
        };

        return await this.verifyPylanceCommand(command, edits);
    }

    async verifyPylanceCommand(command: Command, edits: string[] | WorkspaceEdit): Promise<any> {
        const emptyFiles = { ['']: `` };
        const commandResult = await super.verifyCommand(command, emptyFiles);
        if (WorkspaceEdit.is(commandResult)) {
            if (WorkspaceEdit.is(edits)) {
                this.verifyWorkspaceEdit(edits, commandResult);
            } else {
                if (commandResult.changes !== undefined) {
                    for (const [url, changes] of Object.entries(commandResult.changes)) {
                        let index = 0;
                        for (const change of changes) {
                            const actualText = change.newText;
                            const expectedText: string = edits[index];
                            if (actualText !== expectedText) {
                                this.raiseError(
                                    `${command.title}\n${url} doesn't contain expected result:\n\nexpected:\n${expectedText}\n\nactual:\n${actualText}`
                                );
                            }
                            index++;
                        }
                    }
                }

                if (commandResult.documentChanges !== undefined) {
                    for (const documentChange of commandResult.documentChanges) {
                        if (TextDocumentEdit.is(documentChange)) {
                            let index = 0;
                            for (const change of documentChange.edits) {
                                const actualText = change.newText;
                                const expectedText: string = edits[index];
                                if (actualText !== expectedText) {
                                    this.raiseError(
                                        `${
                                            command.title
                                        }\n${documentChange.textDocument.uri.toString()} doesn't contain expected result:\n\nexpected:\n${expectedText}\n\nactual:\n${actualText}`
                                    );
                                }
                                index++;
                            }
                        }
                    }
                }
            }
        }

        if (!commandResult) {
            // Make sure when we didn't get any result, we don't expect any result.
            if (isArray(edits)) {
                assert.strictEqual(0, edits.length);
            } else {
                assert.strictEqual(0, edits.changes ? Object.keys(edits.changes).length : 0);
                assert.strictEqual(0, edits.documentChanges?.length ?? 0);
                assert.strictEqual(0, edits.changeAnnotations ? Object.keys(edits.changeAnnotations).length : 0);
            }
        }

        return commandResult;
    }

    async verifyRenameFiles(oldPath: string, newPath: string, edits: WorkspaceEdit | null): Promise<any> {
        const actualEdits = await RenameFileProvider.renameFiles(
            new TestLanguageService(this.workspace, this.console, this.fs),
            new TestTelemetryService(),
            { files: [{ oldUri: this.convertPathToUri(oldPath), newUri: this.convertPathToUri(newPath) }] },
            CancellationToken.None
        );

        if (actualEdits) {
            assert(edits);
            this.verifyWorkspaceEdit(edits, actualEdits);
        } else {
            assert.strictEqual(actualEdits, edits);
        }
    }

    verifySemanticTokens(
        data: { fileOrStartMarker: string; endMarker?: string; tokens: { type: string; modifiers?: string[] }[] }[]
    ): void {
        // To perform a query for all tokens, place fileOrStartMarker anywhere
        // in the source file and pass in undefined for endMarker.
        // To perform a query for tokens in a specific range, place the start
        // and end markers to indicate the range.
        const rangePerFile = this.createMultiMap<Range>(this.getRanges(), (r) => r.fileName);
        const legend = this._createSemanticTokensLegend();

        for (const rangedTokenInfo of data) {
            const startMarker = this.getMarkerByName(rangedTokenInfo.fileOrStartMarker);
            const fileName = startMarker.fileName;
            const ranges = rangePerFile.get(fileName) ?? [];

            // If this is a query for a specific range, calculate that range from the marker positions.
            let rangeToRequest: PositionRange | undefined = undefined;
            if (rangedTokenInfo.endMarker !== undefined) {
                const endMarker = this.getMarkerByName(rangedTokenInfo.endMarker);
                assert.equal(
                    fileName,
                    endMarker.fileName,
                    `Start marker ${rangedTokenInfo.fileOrStartMarker} and end marker ${rangedTokenInfo.endMarker} must be in same file.`
                );
                rangeToRequest = {
                    start: this.convertOffsetToPosition(fileName, startMarker.position),
                    end: this.convertOffsetToPosition(fileName, endMarker.position),
                };
            }

            this.openFile(fileName);

            const response = this._getSemanticTokens(fileName, rangeToRequest);
            assert.ok(response);

            const actualTokens = this._decodeSemanticTokens(response, legend);

            // Merge the expected token ranges with the expected token types and modifiers data.
            // Skip the marker ranges, as those don't map to any tokens.
            const expectedTokens = this._buildExpectedSemanticTokens(
                ranges.filter((val) => val.marker === undefined),
                rangedTokenInfo.tokens
            );

            assert.deepStrictEqual(actualTokens, expectedTokens, `Incorrect tokens in file ${startMarker.fileName}`);
        }
    }

    private _getSemanticTokens(filePath: string, range: PositionRange | undefined) {
        const sourceFile = this.program.getSourceFile(filePath);
        if (sourceFile) {
            return getSemanticTokens(this.program, filePath, range, undefined, CancellationToken.None);
        } else {
            this.raiseError(`Source file not found for ${filePath}`);
        }
    }

    private _createSemanticTokensLegend(): SemanticTokensLegend {
        // Simulate the capabilities that are sent by VS Code.
        // Technically, only the types/modifiers understood by the language
        // server are needed, but might as well include the complete list
        // (as of writing) for future proofing.
        const clientCapabilities: SemanticTokensClientCapabilities = {
            formats: [TokenFormat.Relative],
            tokenTypes: [
                'namespace',
                'type',
                'class',
                'enum',
                'interface',
                'struct',
                'typeParameter',
                'parameter',
                'variable',
                'property',
                'enumMember',
                'event',
                'function',
                'method',
                'macro',
                'keyword',
                'modifier',
                'comment',
                'string',
                'number',
                'regexp',
                'operator',
            ],
            tokenModifiers: [
                'declaration',
                'definition',
                'readonly',
                'static',
                'deprecated',
                'abstract',
                'async',
                'modification',
                'documentation',
                'defaultLibrary',
            ],
            requests: {
                full: {
                    delta: true,
                },
                range: true,
            },
        };

        return SemanticTokenProvider.computeLegend(clientCapabilities);
    }

    private _decodeSemanticTokens(tokens: SemanticTokens, legend: SemanticTokensLegend): DecodedSemanticToken[] {
        assert.equal(tokens.data.length % 5, 0);

        const results = [];

        let lastLine = 0;
        let lastChar = 0;

        function getModifierNames(mods: number): string[] {
            const names = [];
            for (let i = 0; i < legend.tokenModifiers.length; i++) {
                if (mods & (1 << i)) {
                    names.push(legend.tokenModifiers[i]);
                }
            }
            return names;
        }

        for (let i = 0; i < tokens.data.length; i += 5) {
            const lineDelta = tokens.data[i];
            const charDelta = tokens.data[i + 1];
            const length = tokens.data[i + 2];
            const typeIdx = tokens.data[i + 3];
            const modSet = tokens.data[i + 4];

            const line = lastLine + lineDelta;
            const char = lineDelta === 0 ? lastChar + charDelta : charDelta;
            const typeName = legend.tokenTypes[typeIdx];
            const modifierNames = getModifierNames(modSet);

            lastLine = line;
            lastChar = char;

            results.push({ line: line, char: char, length: length, type: typeName, modifiers: modifierNames.sort() });
        }

        return results;
    }

    private _buildExpectedSemanticTokens(
        expectedRanges: Range[],
        expectedTypesAndMods: { type: string; modifiers?: string[] | undefined }[]
    ): DecodedSemanticToken[] {
        // The order and the count of ranges should match the order and
        // count of token (type, modifiers) in the map. Merge that information together.
        assert.equal(
            expectedRanges.length,
            expectedTypesAndMods.length,
            'Expected ranges count does not match expected token types/modifiers count.\n' +
                `Expected ranges:\n${stringify(expectedRanges)}\n` +
                `Expected types/modifiers:\n${stringify(expectedTypesAndMods)}\n`
        );

        const expectedTokens = [];
        for (let index = 0; index < expectedRanges.length; index++) {
            const range = expectedRanges[index];
            const rangePos = this.convertOffsetsToRange(range.fileName, range.pos, range.end);
            expectedTokens.push({
                line: rangePos.start.line,
                char: rangePos.start.character,
                length: range.end - range.pos,
                type: expectedTypesAndMods[index].type,
                modifiers: (expectedTypesAndMods[index].modifiers ?? []).sort(),
            });
        }
        return expectedTokens;
    }

    protected override verifyCompletionItem(expected: _.FourSlashCompletionItem, actual: CompletionItem) {
        if (this.rawConfigJson?.completeFunctionParens) {
            updateInsertTextForAutoParensIfNeeded(actual, '', /* hasVSCodeExtension */ true);
        }

        super.verifyCompletionItem(expected, actual);
    }
}

class TestTelemetryService implements TelemetryInterface {
    sendTelemetry(event: TelemetryEventInterface): void {
        // Do nothing.
    }
}
