/*
 * modelLoader.ts
 *
 * IntelliCode model loader.
 */

import { LogLevel } from 'pyright-internal/common/console';

import { LogService } from '../common/logger';
import { getExceptionMessage, TelemetryEventName, TelemetryService } from '../common/telemetry';
import { ModelFileName, ModelMetaDataFileName, ModelTokensFileName, PythiaModel, PythiaModelMetaData } from './models';
import { ZipFile, ZipOpener } from './zip';

export class ModelLoader {
    constructor(
        private readonly _zipOpener: ZipOpener,
        private readonly _logger?: LogService,
        private readonly _telemetry?: TelemetryService
    ) {}

    // Load deep learning model from a model zip file containing three files:
    // 1. model.onnx -- The model file in ONNX format
    // 2. metadata.json -- The metadata file contains PythiaModelMetaData
    // 3. tokens.json -- The model vocabulary
    async loadModel(modelZipPath: string): Promise<PythiaModel | undefined> {
        const zip = this.tryExecute(() => this._zipOpener.open(modelZipPath), 'Unable to open model zip');
        if (!zip) {
            return undefined;
        }

        try {
            const metaData = await this.loadJson<PythiaModelMetaData>(
                zip,
                ModelMetaDataFileName,
                'IntelliCode metadata'
            );
            if (!metaData) {
                return undefined;
            }

            const tokens = await this.loadJson<string[]>(zip, ModelTokensFileName, 'IntelliCode model data');
            if (!tokens) {
                return undefined;
            }

            const modelBuffer = await this.tryExecuteAsync(
                () => zip.entryData(ModelFileName),
                'Unable to read model.onnx'
            );
            if (!modelBuffer) {
                return undefined;
            }

            // Work around https://github.com/facebook/jest/issues/2549; in a jest test, "Buffer" is not
            // the same here as it is in the onnxruntime and instanceof fails. Uint8Array works.
            const model = new Uint8Array(modelBuffer);

            const tokenIdMap = new Map<string, number>(tokens.map((v, i) => [v, i] as [string, number]));
            return {
                model,
                metaData,
                tokens,
                tokenIdMap,
            };
        } finally {
            await this.tryExecuteAsync(() => zip.close(), 'Unable to close model zip');
        }
    }

    private async loadJson<T>(zip: ZipFile, fileName: string, what: string): Promise<T | undefined> {
        try {
            const buffer = await zip.entryData(fileName);
            const content = buffer.toString();
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

    private logError(reason: string, e?: any): void {
        if (e) {
            this._logger?.log(LogLevel.Error, e ? `${reason}. Exception ${getExceptionMessage(e)}` : reason);
            this._telemetry?.sendExceptionTelemetry(TelemetryEventName.INTELLICODE_MODEL_LOAD_FAILED, e);
        } else {
            this._logger?.log(LogLevel.Error, reason);
        }
    }
}
