/*
 * modelLoader.ts
 *
 * IntelliCode model loader.
 */

import * as path from 'path';

import { FileSystem } from '../pyright/server/src/common/fileSystem';
import { LogLevel, LogService } from '../src/common/logger';
import {
    ModelFileName,
    ModelMetaDataFileName,
    ModelTokensFileName,
    ModelZipFileName,
    PythiaModel,
    PythiaModelMetaData,
} from './models';
import { Zip } from './zip';

const modelFilesExt = '.onnx';

export class ModelLoader {
    constructor(private _fs: FileSystem, private _zip: Zip, private _logger?: LogService) {}

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
                this._logger?.log(LogLevel.Error, `Unable to create folder ${modelUnpackFolder}: ${error.code}`);
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
            }
        } catch (e) {
            this._logger?.log(LogLevel.Error, `Unable to read ${what}. Exception ${e.message} in ${e.stack}`);
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
            return undefined;
        }
    }

    private async tryExecuteAsync<T>(callback: () => Promise<T>, message: string): Promise<T | undefined> {
        try {
            return await callback();
        } catch (e) {
            this._logger?.log(LogLevel.Error, `${message} Exception ${e.message} in ${e.stack}`);
            return undefined;
        }
    }
}
