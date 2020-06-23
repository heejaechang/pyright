// Base class for a popup (banner) that proposes user to try out a new feature of
// the extension, and optionally enable that new feature if they choose to do so.

import { ConfigurationTarget, Memento } from 'vscode';

import * as localize from './common/localize';
import { AppConfiguration } from './types/appConfig';
import { ApplicationShell } from './types/appShell';
import { CommandManager } from './types/commandManager';

abstract class BannerBase {
    protected disabledInCurrentSession = false;

    constructor(private readonly settingName: string, private readonly memento: Memento) {}

    get enabled(): boolean {
        return this.disabledInCurrentSession ? false : this.memento.get(this.settingName, true);
    }

    async disable(): Promise<void> {
        return this.memento.update(this.settingName, false);
    }

    abstract async showBanner(): Promise<void>;
}

// Prompt for Pylance when extension is installed.
export class ActivatePylanceBanner extends BannerBase {
    static readonly SettingKey = 'RequestSwitchToPylance';

    static readonly Message = localize.LanguageServer.installedButInactive();
    static readonly LabelYes = localize.LanguageServer.turnItOn();
    static readonly LabelNo = localize.LanguageServer.noThanks();
    static readonly LabelLater = localize.LanguageServer.remindMeLater();

    // TODO: Replace by Pylance
    static readonly ExpectedLanguageServer = 'Node';

    constructor(
        private readonly appShell: ApplicationShell,
        private readonly appConfig: AppConfiguration,
        private readonly cmdManager: CommandManager,
        memento: Memento
    ) {
        super(ActivatePylanceBanner.SettingKey, memento);
    }

    async showBanner(): Promise<void> {
        if (!this.shouldShowBanner()) {
            return;
        }

        const response = await this.appShell.showInformationMessage(
            ActivatePylanceBanner.Message,
            ActivatePylanceBanner.LabelYes,
            ActivatePylanceBanner.LabelNo,
            ActivatePylanceBanner.LabelLater
        );

        if (response === ActivatePylanceBanner.LabelLater) {
            this.disabledInCurrentSession = true;
            return;
        }
        if (response === ActivatePylanceBanner.LabelYes) {
            await this.disable(); // Disable first since next call causes reload.
            await this.enableLanguageServer();
        }
        await this.disable();
    }

    private shouldShowBanner(): boolean {
        if (!this.enabled) {
            return false;
        }
        const ls = this.appConfig.getSetting<string>('languageServer');
        return ls !== ActivatePylanceBanner.ExpectedLanguageServer && ls !== 'Node';
    }

    private async enableLanguageServer(): Promise<void> {
        await this.appConfig.updateSetting(
            'languageServer',
            ActivatePylanceBanner.ExpectedLanguageServer,
            ConfigurationTarget.Global
        );
        await this.cmdManager.executeCommand('workbench.action.reloadWindow');
    }
}
