import { anyString, anything, capture, instance, mock, verify, when } from 'ts-mockito';
import { Memento } from 'vscode';

import { ActivatePylanceBanner } from '../banners';
import * as localize from '../common/localize';
import { AppConfiguration } from '../types/appConfig';
import { ApplicationShell } from '../types/appShell';
import { CommandManager } from '../types/commandManager';

let appShellMock: ApplicationShell;
let appConfigMock: AppConfiguration;
let mementoMock: Memento;
let cmdMock: CommandManager;
let settings: Map<string, boolean>;

describe('Banners', () => {
    beforeEach(() => {
        appShellMock = mock<ApplicationShell>();
        appConfigMock = mock<AppConfiguration>();
        mementoMock = mock<Memento>();
        cmdMock = mock<CommandManager>();
        settings = new Map<string, boolean>();
    });

    test('Banner enabled by default', async () => {
        when(mementoMock.get(ActivatePylanceBanner.SettingKey, true)).thenReturn(true);

        const banner = makeBanner();
        expect(banner.enabled).toEqual(true);

        await banner.showBanner();
        verify(appShellMock.showInformationMessage(anyString(), anyString(), anyString(), anyString())).once();
    });

    test('Disable banner', async () => {
        setUpSettingStorage(ActivatePylanceBanner.SettingKey);

        const banner = makeBanner();
        await banner.disable();
        expect(settings.get(ActivatePylanceBanner.SettingKey)).toEqual(false);
        expect(banner.enabled).toEqual(false);

        await banner.showBanner();
        verify(appShellMock.showInformationMessage(anyString(), anyString(), anyString(), anyString())).never();
    });

    test('Selecting No disables banner forever', async () => {
        setUpSettingStorage(ActivatePylanceBanner.SettingKey);
        when(appShellMock.showInformationMessage(anyString(), anyString(), anyString(), anyString())).thenReturn(
            Promise.resolve(localize.LanguageServer.noThanks())
        );

        const banner = makeBanner();
        await banner.showBanner();
        expect(settings.get(ActivatePylanceBanner.SettingKey)).toEqual(false);
        expect(banner.enabled).toEqual(false);
    });

    test('Selecting Later disables banner in session', async () => {
        setUpSettingStorage(ActivatePylanceBanner.SettingKey);
        when(appShellMock.showInformationMessage(anyString(), anyString(), anyString(), anyString())).thenReturn(
            Promise.resolve(localize.LanguageServer.remindMeLater())
        );

        const banner = makeBanner();
        await banner.showBanner();
        expect(banner.enabled).toEqual(false);
    });

    test('Selecting Yes changes python.languageServer setting and reloads window', async () => {
        setUpSettingStorage(ActivatePylanceBanner.SettingKey);
        when(appShellMock.showInformationMessage(anyString(), anyString(), anyString(), anyString())).thenReturn(
            Promise.resolve(localize.LanguageServer.turnItOn())
        );

        const banner = makeBanner();
        await banner.showBanner();
        const [setting, value] = capture(appConfigMock.updateSetting).first();
        expect(setting).toEqual('languageServer');
        expect(value).toEqual(ActivatePylanceBanner.ExpectedLanguageServer);
        verify(cmdMock.executeCommand('workbench.action.reloadWindow')).once();
    });

    test('Banner not shown when python.languageServer setting is Pylance', async () => {
        setUpSettingStorage(ActivatePylanceBanner.SettingKey);
        when(appShellMock.showInformationMessage(anyString(), anyString(), anyString(), anyString())).thenReturn(
            Promise.resolve(localize.LanguageServer.remindMeLater())
        );

        const banner = makeBanner(ActivatePylanceBanner.ExpectedLanguageServer);
        await banner.showBanner();
        verify(appShellMock.showInformationMessage(anyString(), anyString(), anyString(), anyString())).never();
    });

    function setUpSettingStorage(key: string): void {
        when(mementoMock.get(key, true)).thenCall(() => {
            const value = settings.get(key);
            return value === undefined ? true : value;
        });
        when(mementoMock.get(key, false)).thenCall(() => {
            const value = settings.get(key);
            return value === undefined ? false : value;
        });
        when(mementoMock.update(key, false)).thenCall(() => {
            settings.set(key, false);
            return Promise.resolve();
        });
        when(mementoMock.update(key, true)).thenCall(() => {
            settings.set(key, true);
            return Promise.resolve();
        });
    }

    function makeBanner(lsType?: string): ActivatePylanceBanner {
        when(appConfigMock.getSetting<string>('languageServer')).thenReturn(lsType ?? 'Jedi');
        when(appConfigMock.updateSetting(anyString(), anything())).thenReturn(Promise.resolve());
        return new ActivatePylanceBanner(
            instance(appShellMock),
            instance(appConfigMock),
            instance(cmdMock),
            instance(mementoMock)
        );
    }
});
