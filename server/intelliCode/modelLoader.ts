/*
 * modelLoader.ts
 *
 * IntelliCode model loader.
 */

import * as path from 'path';

import { FileSystem } from '../pyright/server/src/common/fileSystem';
import { LogLevel, LogService } from '../src/common/logger';
import { sendExceptionTelemetry, TelemetryEventName, TelemetryService } from '../src/common/telemetry';
import { PythiaModel, PythiaModelMetaData } from './models';
import { Zip } from './zip';

const metaDataFileName = 'metadata.json';
const tokensFileName = 'tokens.json';
const modelFilesExt = '.onnx';

export class ModelLoader {
    constructor(
        private _fs: FileSystem,
        private _zip: Zip,
        private _logger?: LogService,
        private _telemetry?: TelemetryService
    ) {}

    // Load deep learning model from a model zip file containing three files:
    // 1. *.onnx -- The model file in ONNX fomrat
    // 2. metadata.json -- The metadata file contains PythiaModelMetaData
    // 3. tokens.json -- The model vocabulary
    async loadModel(moduleFolder: string): Promise<PythiaModel | undefined> {
        const modelFolder = path.join(moduleFolder, 'IntelliCode');
        try {
            this._fs.mkdirSync(modelFolder);
            // eslint-disable-next-line no-empty
        } catch (error) {
            if (error.code !== 'EEXIST') {
                this._logger?.log(LogLevel.Error, `Unable to create folder ${modelFolder}: ${error.code}`);
                sendExceptionTelemetry(this._telemetry, TelemetryEventName.EXCEPTION_IC, error);
                return undefined;
            }
        }

        if (!this.isModelUnpacked(modelFolder)) {
            const result = await this.tryExecuteAsync(
                async () => await this._zip.unzip(path.join(modelFolder, 'model.zip'), modelFolder),
                'Unable to unpack IntelliCode data.'
            );
            if (!result || result === 0) {
                return undefined;
            }

            const modelFiles = this.tryExecute(
                () => this._fs.readdirSync(modelFolder).filter((f) => path.extname(f) === modelFilesExt),
                'Unable to access IntelliCode folder.'
            );

            if (!modelFiles) {
                return undefined; // Error was already logged.
            }

            if (modelFiles.length === 0) {
                this._logger?.log(LogLevel.Error, `Unable to find any IntelliCode data in ${modelFolder}.`);
                return undefined;
            }
        }

        const metaDataFilePath = path.join(modelFolder, metaDataFileName);
        const metaData = await this.loadJson<PythiaModelMetaData>(metaDataFilePath, 'IntelliCode metadata');
        if (!metaData) {
            return undefined;
        }

        const tokensFilePath = path.join(modelFolder, tokensFileName);
        const tokens = await this.loadJson<string[]>(tokensFilePath, 'IntelliCode model data');
        if (!tokens) {
            return undefined;
        }

        const tokenIdMap = new Map<string, number>(tokens.map((v, i) => [v, i] as [string, number]));
        return {
            metaData,
            tokens,
            tokenIdMap,
        };
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
            this._fs.existsSync(path.join(folder, metaDataFileName)) &&
            this._fs.existsSync(path.join(folder, tokensFileName)) &&
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
