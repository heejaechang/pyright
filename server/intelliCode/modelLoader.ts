/*
 * modelLoader.ts
 *
 * IntelliCode model loader.
 */

import * as path from 'path';

import { assert } from '../pyright/server/src/common/debug';
import { FileSystem } from '../pyright/server/src/common/fileSystem';
import { LogLevel, LogService } from '../src/common/logger';
import { sendExceptionTelemetry, TelemetryEventName, TelemetryService } from '../src/common/telemetry';
import {
    ModelFileName,
    ModelMetaDataFileName,
    ModelTokensFileName,
    ModelZipAcquisitionService,
    ModelZipFileName,
    PythiaModel,
    PythiaModelMetaData,
} from './models';
import { Zip } from './zip';

const modelFilesExt = '.onnx';

export class ModelLoader {
    constructor(
        private _fs: FileSystem,
        private _zip: Zip,
        private _logger?: LogService,
        private _telemetry?: TelemetryService
    ) {}

    // Load deep learning model from a model zip file containing three files:
    // 1. *.onnx -- The model file in ONNX format
    // 2. metadata.json -- The metadata file contains PythiaModelMetaData
    // 3. tokens.json -- The model vocabulary
    async loadModel(
        modelService: ModelZipAcquisitionService,
        modelUnpackFolder: string
    ): Promise<PythiaModel | undefined> {
        if (!this.isModelUnpacked(modelUnpackFolder)) {
            if (!(await this.acquireModel(modelService, modelUnpackFolder))) {
                return undefined;
            }
        }

        const metaDataFilePath = path.join(modelUnpackFolder!, ModelMetaDataFileName);
        const metaData = await this.loadJson<PythiaModelMetaData>(metaDataFilePath, 'IntelliCode metadata');
        if (!metaData) {
            return undefined;
        }

        const tokensFilePath = path.join(modelUnpackFolder, ModelTokensFileName);
        const tokens = await this.loadJson<string[]>(tokensFilePath, 'IntelliCode model data');
        if (!tokens) {
            return undefined;
        }

        const tokenIdMap = new Map<string, number>(tokens.map((v, i) => [v, i] as [string, number]));
        return {
            onnxModelPath: path.join(modelUnpackFolder, ModelFileName),
            metaData,
            tokens,
            tokenIdMap,
        };
    }

    private async acquireModel(modelService: ModelZipAcquisitionService, modelUnpackFolder: string): Promise<boolean> {
        if (this._fs.existsSync(path.join(modelUnpackFolder, ModelZipFileName))) {
            return true;
        }
        // Get path to the downloaded model zip file.
        let modelZipFilePath: string;
        try {
            this._logger?.log(LogLevel.Info, 'Downloading IntelliCode data...');
            modelZipFilePath = await modelService.getModel();
            assert(modelZipFilePath !== undefined);
            this._logger?.log(LogLevel.Info, 'Successfully downloaded IntelliCode data.');
        } catch (e) {
            this._logger?.log(LogLevel.Error, `Failed to download IntelliCode data. Exception: ${e.stack}`);
            sendExceptionTelemetry(this._telemetry, TelemetryEventName.EXCEPTION_IC, e);
            return false;
        }

        try {
            // Create target folder to unpack the model into.
            if (!this._fs.existsSync(modelUnpackFolder)) {
                this._fs.mkdirSync(modelUnpackFolder, { recursive: true });
            }
        } catch (error) {
            if (error.code !== 'EEXIST') {
                this._logger?.log(LogLevel.Error, `Unable to create folder ${modelUnpackFolder}: ${error.code}`);
                sendExceptionTelemetry(this._telemetry, TelemetryEventName.EXCEPTION_IC, error);
                return false;
            }
        }

        const result = await this.tryExecuteAsync(
            async () => await this._zip.unzip(modelZipFilePath, modelUnpackFolder!),
            'Unable to unpack IntelliCode data.'
        );
        if (!result || result === 0) {
            return false;
        }

        const modelFiles = this.tryExecute(
            () => this._fs.readdirSync(modelUnpackFolder!).filter((f) => path.extname(f) === modelFilesExt),
            'Unable to access IntelliCode folder.'
        );

        if (!modelFiles) {
            return false; // Error was already logged.
        }

        if (modelFiles.length === 0) {
            this._logger?.log(LogLevel.Error, `Unable to find any IntelliCode data in ${modelUnpackFolder}.`);
            return false;
        }

        return true;
    }

    private async loadJson<T>(fileName: string, what: string): Promise<T | undefined> {
        try {
            const content = await this._fs.readFileText(fileName, 'utf8');
            try {
                return JSON.parse(content);
            } catch (e) {
                this._logger?.log(LogLevel.Error, `Unable to parse ${what}. Exception ${e.message} in ${e.stack}`);
                sendExceptionTelemetry(this._telemetry, TelemetryEventName.EXCEPTION_IC, e);
            }
        } catch (e) {
            this._logger?.log(LogLevel.Error, `Unable to read ${what}. Exception ${e.message} in ${e.stack}`);
            sendExceptionTelemetry(this._telemetry, TelemetryEventName.EXCEPTION_IC, e);
        }
        return undefined;
    }

    private isModelUnpacked(folder: string): boolean {
        return (
            this._fs.existsSync(path.join(folder, ModelMetaDataFileName)) &&
            this._fs.existsSync(path.join(folder, ModelTokensFileName)) &&
            this._fs.readdirSync(folder).filter((f) => path.extname(f) === modelFilesExt).length > 0
        );
    }

    private tryExecute<T>(callback: () => T, message: string): T | undefined {
        try {
            return callback();
        } catch (e) {
            this._logger?.log(LogLevel.Error, `${message} Exception ${e.message} in ${e.stack}`);
            sendExceptionTelemetry(this._telemetry, TelemetryEventName.EXCEPTION_IC, e);
            return undefined;
        }
    }

    private async tryExecuteAsync<T>(callback: () => Promise<T>, message: string): Promise<T | undefined> {
        try {
            return await callback();
        } catch (e) {
            this._logger?.log(LogLevel.Error, `${message} Exception ${e.message} in ${e.stack}`);
            sendExceptionTelemetry(this._telemetry, TelemetryEventName.EXCEPTION_IC, e);
            return undefined;
        }
    }
}
