/*
 * modelLoader.ts
 *
 * IntelliCode model loader.
 */

import * as path from 'path';

import { LogLevel } from 'pyright-internal/common/console';
import { FileSystem } from 'pyright-internal/common/fileSystem';

import { LogService } from '../common/logger';
import { TelemetryEvent, TelemetryEventName, TelemetryService } from '../common/telemetry';
import {
    ModelFileName,
    ModelMetaDataFileName,
    ModelTokensFileName,
    ModelZipFileName,
    PythiaModel,
    PythiaModelMetaData,
} from './models';
import { getExceptionMessage } from './types';
import { Zip } from './zip';

const modelFilesExt = '.onnx';

export class ModelLoader {
    constructor(
        private readonly _fs: FileSystem,
        private readonly _zip: Zip,
        private readonly _logger?: LogService,
        private readonly _telemetry?: TelemetryService
    ) {}

    // Load deep learning model from a model zip file containing three files:
    // 1. *.onnx -- The model file in ONNX format
    // 2. metadata.json -- The metadata file contains PythiaModelMetaData
    // 3. tokens.json -- The model vocabulary
    async loadModel(modelZipPath: string, modelUnpackFolder: string): Promise<PythiaModel | undefined> {
        if (!this.isModelUnpacked(modelUnpackFolder)) {
            if (!(await this.unpackModel(modelZipPath, modelUnpackFolder))) {
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

    private async unpackModel(modelZipPath: string, modelUnpackFolder: string): Promise<boolean> {
        if (this._fs.existsSync(path.join(modelUnpackFolder, ModelZipFileName))) {
            return true;
        }

        try {
            // Create target folder to unpack the model into.
            if (!this._fs.existsSync(modelUnpackFolder)) {
                this._fs.mkdirSync(modelUnpackFolder, { recursive: true });
            }
        } catch (error) {
            if (error.code !== 'EEXIST') {
                const message = 'Unable to create model folder';
                this._logger?.log(LogLevel.Error, `${message} ${modelUnpackFolder}, error ${error.code}`);
                this.sendTelemetry(`${message}, error ${error.code}`);
                return false;
            }
        }

        const result = await this.tryExecuteAsync(
            async () => await this._zip.unzip(modelZipPath, modelUnpackFolder!),
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
            const message = 'Unable to find any IntelliCode data';
            this._logger?.log(LogLevel.Error, `${message} in ${modelUnpackFolder}.`);
            this.sendTelemetry(message);
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
                this.logError(`Unable to parse ${what}`, e);
            }
        } catch (e) {
            this.logError(`Unable to read ${what}`, e);
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
            this.logError(message, e);
            return undefined;
        }
    }

    private async tryExecuteAsync<T>(callback: () => Promise<T>, message: string): Promise<T | undefined> {
        try {
            return await callback();
        } catch (e) {
            this.logError(message, e);
            return undefined;
        }
    }

    private logError(reason: string, e?: Error): void {
        this._logger?.log(LogLevel.Error, e ? `${reason}. Exception ${getExceptionMessage(e)}` : reason);
        this.sendTelemetry(reason);
    }

    private sendTelemetry(reason: string): void {
        const te = new TelemetryEvent(TelemetryEventName.INTELLICODE_MODEL_LOAD_FAILED);
        te.Properties['Reason'] = reason;
        this._telemetry?.sendTelemetry(te);
    }
}
