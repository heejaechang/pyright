import * as path from 'path';
import * as semver from 'semver';
import { ConfigurationChangeEvent, Uri } from 'vscode';

import { Octicons } from '../common/icons';
import * as localize from '../common/localize';
import { PersistentState, PersistentStateFactory, StateKey } from '../common/persistentState';
import { AppConfiguration } from '../types/appConfig';
import { ApplicationShell } from '../types/appShell';
import { Command, CommandManager } from '../types/commandManager';
import { BlobStorage } from './blobStorage';

export type DownloadChannel = 'off' | 'daily';

export const insidersChannelSetting = 'insidersChannel';
export const fullInsidersChannelSetting = 'pylance.' + insidersChannelSetting;

const oneDayMs = 24 * 60 * 60 * 1000;

export class InsidersImpl {
    private _version: semver.SemVer;
    private _currentChannel: PersistentState<DownloadChannel | undefined>;
    private _lastUpdate: PersistentState<number | undefined>;

    readonly Downgrade = localize.Insiders.downgradeInsiders();
    readonly Installed = localize.Insiders.installedInsiders();
    readonly LabelYes = localize.Common.yes();
    readonly LabelYesAndReload = localize.LanguageServer.turnItOn();
    readonly LabelNo = localize.Common.no();
    readonly LabelReload = localize.Common.reload();

    constructor(
        version: string,
        private readonly downloadDir: string,
        private readonly config: AppConfiguration,
        private readonly appShell: ApplicationShell,
        persistentState: PersistentStateFactory,
        private readonly blobStorage: BlobStorage,
        private readonly cmdManager: CommandManager
    ) {
        this._version = new semver.SemVer(version);
        this._currentChannel = persistentState.createGlobalPersistentState(StateKey.InsidersCurrentChannel);
        this._lastUpdate = persistentState.createGlobalPersistentState(StateKey.InsidersLastUpdate);
    }

    async onStartup(): Promise<void> {
        const [current, changed] = this._updateChannel();

        if (current === 'off') {
            await this._onInsidersOff();
            return;
        }

        if (changed || this._readyToCheck()) {
            await this._update(false);
        }
    }

    async onChange(e: ConfigurationChangeEvent): Promise<void> {
        if (!e.affectsConfiguration(fullInsidersChannelSetting)) {
            return;
        }

        const [current, changed] = this._updateChannel();

        if (!changed) {
            return;
        }

        if (current === 'off') {
            await this._onInsidersOff();
            return;
        }

        await this._update(false);
    }

    private _updateChannel(): [current: DownloadChannel, changed: boolean] {
        const current = this.config.getSetting<DownloadChannel>('pylance', insidersChannelSetting) ?? 'off';
        const last = this._currentChannel.value;

        if (current === last) {
            return [current, false];
        }

        this._currentChannel.updateValue(current);
        return [current, true];
    }

    private _readyToCheck(): boolean {
        const lastUpdate = this._lastUpdate.value;
        return !lastUpdate || Date.now() - lastUpdate > oneDayMs;
    }

    private async _onInsidersOff(): Promise<void> {
        this._lastUpdate.updateValue(undefined);
        if (this._version.prerelease.length !== 0) {
            await this._promptStable();
        }
    }

    private async _promptStable(): Promise<void> {
        const response = await this.appShell.showInformationMessage(
            this.Downgrade,
            this.LabelYesAndReload,
            this.LabelNo
        );

        if (response === this.LabelYesAndReload) {
            await this._update(true);
        }
    }

    private async _update(downgradeToStable: boolean): Promise<void> {
        this._lastUpdate.updateValue(Date.now());

        const latest = await this.blobStorage.getLatest(downgradeToStable);
        if (!latest) {
            return;
        }

        if (!downgradeToStable && semver.lte(latest.version, this._version)) {
            return;
        }

        const vsixPath = path.join(this.downloadDir, latest.name);
        const totalBytes = latest.contentLength;

        await this.appShell.withProgressCustomIcon(Octicons.Downloading, async (progress) => {
            let bytes = 0;
            return this.blobStorage.download(latest.name, vsixPath, (p) => {
                let increment: number | undefined;
                if (totalBytes) {
                    // The blob client provides the total bytes downloaded so far, but VS Code wants increments.
                    // Keep track of how big each step is to report it.
                    increment = 100 * ((p.loadedBytes - bytes) / totalBytes);
                    bytes = p.loadedBytes;
                }

                progress.report({ message: localize.Insiders.downloadingInsiders(), increment });
            });
        });

        await this.appShell.withProgressCustomIcon(Octicons.Installing, async (progress) => {
            progress.report({ message: localize.Insiders.installingInsiders() });
            return this.cmdManager.executeCommand(Command.InstallExtension, Uri.file(vsixPath));
        });

        if (!downgradeToStable) {
            const response = await this.appShell.showInformationMessage(this.Installed, this.LabelReload);
            if (response === this.LabelReload) {
                await this.cmdManager.executeCommand(Command.ReloadWindow);
            }
        } else {
            // Don't ask on downgrade; the user has already been prompted.
            await this.cmdManager.executeCommand(Command.ReloadWindow);
        }
    }
}
