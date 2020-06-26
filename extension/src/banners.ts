// Base class for a popup (banner) that proposes user to try out a new feature of
// the extension, and optionally enable that new feature if they choose to do so.

import { ConfigurationTarget, Memento } from 'vscode';

import * as localize from './common/localize';
import { getRandomBetween } from './common/utils';
import { AppConfiguration } from './types/appConfig';
import { ApplicationShell } from './types/appShell';
import { BrowserService } from './types/browser';
import { CommandManager } from './types/commandManager';

abstract class BannerBase {
    protected disabledInCurrentSession = false;

    constructor(private readonly settingName: string, protected readonly memento: Memento) {}

    get enabled(): boolean {
        return this.disabledInCurrentSession ? false : this.memento.get(this.settingName, true);
    }

    async disable(): Promise<void> {
        return this.memento.update(this.settingName, false);
    }

    abstract async show(): Promise<void>;
}

// Prompt for Pylance when extension is installed.
export class ActivatePylanceBanner extends BannerBase {
    readonly SettingKey = 'ActivatePylanceBanner';

    readonly Message = localize.LanguageServer.installedButInactive();
    readonly LabelYes = localize.LanguageServer.turnItOn();
    readonly LabelNo = localize.LanguageServer.noThanks();
    readonly LabelLater = localize.Common.remindMeLater();

    // TODO: Replace by Pylance
    static readonly ExpectedLanguageServer = 'Node';

    constructor(
        private readonly appShell: ApplicationShell,
        private readonly appConfig: AppConfiguration,
        private readonly cmdManager: CommandManager,
        memento: Memento
    ) {
        super('ActivatePylanceBanner', memento);
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

// Prompt for Pylance surve.
export class PylanceSurveyBanner extends BannerBase {
    private readonly ShowAfterCountKey = 'PylanceSurveyShowAfterCount';
    private readonly LaunchCounterKey = 'PylanceLaunchCounter';

    readonly SettingKey = 'PylanceSurveyBanner';
    readonly Message = localize.LanguageServer.surveyMessage();
    readonly LabelYes = localize.Common.yes();
    readonly LabelNo = localize.Common.no();
    readonly LabelLater = localize.Common.remindMeLater();

    constructor(
        private readonly appShell: ApplicationShell,
        private readonly browser: BrowserService,
        memento: Memento,
        private readonly lsVersion: string,
        private readonly minEventBeforeShow = 20,
        private readonly maxEventBeforeShow = 50
    ) {
        super('PylanceSurveyBanner', memento);
    }

    async show(): Promise<void> {
        if (!(await this.shouldShowBanner())) {
            return;
        }

        const response = await this.appShell.showInformationMessage(
            this.Message,
            this.LabelYes,
            this.LabelNo,
            this.LabelLater
        );

        switch (response) {
            case this.LabelNo:
                await this.disable();
                break;
            case this.LabelYes:
                await this.disable();
                await this.launchSurvey();
                break;
            case this.LabelLater:
            default:
                this.disabledInCurrentSession = true;
                break;
        }
    }

    // Public for tests
    getSurverUrl(launchCounter: number, lsVersion: string) {
        return `https://www.surveymonkey.com/r/ZK7YYVF?n=${launchCounter}&v=${lsVersion}`;
    }

    private async shouldShowBanner(): Promise<boolean> {
        if (!this.enabled) {
            return false;
        }
        const launchCounter = await this.incrementLaunchCounter();
        const threshold = await this.getLaunchThreshold();
        return launchCounter >= threshold;
    }

    public async launchSurvey(): Promise<void> {
        const launchCounter = this.getLaunchCounter();
        const lsVersion = encodeURIComponent(this.lsVersion);
        this.browser.launch(this.getSurverUrl(launchCounter, lsVersion));
    }

    private async incrementLaunchCounter(): Promise<number> {
        const counter = this.getLaunchCounter() + 1;
        await this.memento.update(this.LaunchCounterKey, counter);
        return counter;
    }

    private getLaunchCounter(): number {
        return this.memento.get<number>(this.LaunchCounterKey, 0);
    }

    private async getLaunchThreshold(): Promise<number> {
        // If user-spefic threshold is not set, generate random number.
        let threshold = this.memento.get<number | undefined>(this.ShowAfterCountKey, undefined);
        if (threshold === undefined) {
            threshold = getRandomBetween(this.minEventBeforeShow, this.maxEventBeforeShow);
            await this.memento.update(this.ShowAfterCountKey, threshold);
        }
        return threshold;
    }
}
