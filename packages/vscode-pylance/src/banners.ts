// Base class for a popup (banner) that proposes user to try out a new feature of
// the extension, and optionally enable that new feature if they choose to do so.

import { ConfigurationTarget, Memento } from 'vscode';

import * as localize from './common/localize';
import {
    getRandomBetween,
    isPylanceDefaultLanguageServer,
    LanguageServerSettingName,
    PylanceName,
} from './common/utils';
import { AppConfiguration } from './types/appConfig';
import { ApplicationShell } from './types/appShell';
import { BrowserService } from './types/browser';
import { Command, CommandManager } from './types/commandManager';

abstract class BannerBase {
    protected disabledInCurrentSession = false;

    constructor(private readonly settingName: string, protected readonly memento: Memento) {}

    get enabled(): boolean {
        return this.disabledInCurrentSession ? false : this.memento.get(this.settingName, true);
    }

    async disable(): Promise<void> {
        return this.memento.update(this.settingName, false);
    }

    abstract show(): Promise<void>;
}

function getActivatePylanceBannerSettingKey(_version: string): string {
    return `ActivatePylanceBanner3`;
}

// Prompt for Pylance when extension is installed.
export class ActivatePylanceBanner extends BannerBase {
    readonly Message = localize.LanguageServer.installedButInactive();
    readonly LabelYes = localize.LanguageServer.turnItOn();
    readonly LabelNo = localize.LanguageServer.noThanks();
    readonly LabelLater = localize.Common.remindMeLater();

    readonly settingKey: string;

    constructor(
        private readonly appShell: ApplicationShell,
        private readonly appConfig: AppConfiguration,
        private readonly cmdManager: CommandManager,
        memento: Memento,
        version: string
    ) {
        super(getActivatePylanceBannerSettingKey(version), memento);
        this.settingKey = getActivatePylanceBannerSettingKey(version);
    }

    async show(): Promise<void> {
        if (!this.shouldShowBanner()) {
            return;
        }

        const response = await this.appShell.showInformationMessage(
            this.Message,
            this.LabelYes,
            this.LabelNo,
            this.LabelLater
        );

        if (response === this.LabelLater) {
            this.disabledInCurrentSession = true;
            return;
        }
        if (response === this.LabelYes) {
            await this.enableLanguageServer();
        } else {
            await this.disable();
        }
    }

    private shouldShowBanner(): boolean {
        if (!this.enabled) {
            return false;
        }
        return !isPylanceDefaultLanguageServer(this.appConfig);
    }

    private async enableLanguageServer(): Promise<void> {
        // Figure out which one to set.
        const inspect = this.appConfig.inspect<string>('python', LanguageServerSettingName);
        // If setting is specified per folder, we leave it alone. Scope of the setting is `window`.
        // If LS is specified in both workspace and global, we change nearest one, i.e. the workspace.
        if (inspect?.workspaceValue) {
            await this.appConfig.updateSetting(
                'python',
                LanguageServerSettingName,
                PylanceName,
                ConfigurationTarget.Workspace
            );
        } else {
            // Global or not specified. Apply new value in the global scope.
            await this.appConfig.updateSetting(
                'python',
                LanguageServerSettingName,
                PylanceName,
                ConfigurationTarget.Global
            );
        }
        await this.cmdManager.executeCommand(Command.ReloadWindow);
    }
}
