import * as debug from "../../../common/debug";
import { TestCaseParser } from "./testCaseParser";

/** Represents a parsed source file with metadata */
export interface FourSlashFile {
    // The contents of the file (with markers, etc stripped out)
    content: string;
    fileName: string;
    version: number;
    // File-specific options (name/value pairs)
    fileOptions: TestCaseParser.CompilerSettings;
}

/** Represents a set of parsed source files and options */
export interface FourSlashData {
    // Global options (name/value pairs)
    globalOptions: TestCaseParser.CompilerSettings;
    files: FourSlashFile[];

    // A mapping from marker names to name/position pairs
    markerPositions: Map<string, Marker>;
    markers: Marker[];

    /**
     * Inserted in source files by surrounding desired text
     * in a range with `[|` and `|]`. For example,
     *
     * [|text in range|]
     *
     * is a range with `text in range` "selected".
     */
    ranges: Range[];
    rangesByText?: MultiMap<Range>;
}

/** Name of testcase metadata including ts.CompilerOptions properties that will be used by globalOptions
 *  To add additional option, add property into the testOptMetadataNames, refer the property in either globalMetadataNames or fileMetadataNames
 *  Add cases into convertGlobalOptionsToCompilationsSettings function for the compiler to acknowledge such option from meta data */
export const enum MetadataOptionNames {
    baselineFile = "baselinefile",
    emitThisFile = "emitthisfile",
    fileName = "filename",
    resolveReference = "resolvereference"
}

/** List of allowed metadata names */
export const fileMetadataNames = [MetadataOptionNames.fileName, MetadataOptionNames.emitThisFile, MetadataOptionNames.resolveReference];

/** four slash test types
 * 1. add explanation on what each enum member means
 */
export const enum FourSlashTestType {
    Native,
    // Shims,
    // ShimsWithPreprocess,
    // Server
}

export interface Marker {
    fileName: string;
    position: number;
    data?: {};
}
export interface Range {
    fileName: string;
    marker?: Marker;
    pos: number;
    end: number;
}

export interface MultiMap<T> extends Map<string, T[]> {
    /**
     * Adds the value to an array of values associated with the key, and returns the array.
     * Creates the array if it does not already exist.
     */
    add(key: string, value: T): T[];

    /**
     * Removes a value from an array of values associated with the key.
     * Does not preserve the order of those values.
     * Does nothing if `key` is not in `map`, or `value` is not in `map[key]`.
     */
    remove(key: string, value: T): void;
}

/** Review: is this needed? we might just use one from vscode */
export interface HostCancellationToken {
    isCancellationRequested(): boolean;
}

export class TestCancellationToken implements HostCancellationToken {
    // 0 - cancelled
    // >0 - not cancelled
    // <0 - not cancelled and value denotes number of isCancellationRequested after which token become cancelled
    private static readonly notCanceled = -1;
    private numberOfCallsBeforeCancellation = TestCancellationToken.notCanceled;

    public isCancellationRequested(): boolean {
        if (this.numberOfCallsBeforeCancellation < 0) {
            return false;
        }

        if (this.numberOfCallsBeforeCancellation > 0) {
            this.numberOfCallsBeforeCancellation--;
            return false;
        }

        return true;
    }

    public setCancelled(numberOfCalls = 0): void {
        debug.assert(numberOfCalls >= 0);
        this.numberOfCallsBeforeCancellation = numberOfCalls;
    }

    public resetCancelled(): void {
        this.numberOfCallsBeforeCancellation = TestCancellationToken.notCanceled;
    }
}