import { anyString, anything, capture, instance, mock, verify, when } from 'ts-mockito';
import { Memento } from 'vscode';

import { ActivatePylanceBanner } from '../banners';
import { AppConfiguration } from '../types/appConfig';
import { ApplicationShell } from '../types/appShell';
import { CommandManager } from '../types/commandManager';
import { TestMemento } from './testUtil';

let appShellMock: ApplicationShell;
let appConfigMock: AppConfiguration;
let cmdMock: CommandManager;
let settings: Memento;

describe('Prompt to use Pylance', () => {
    beforeEach(() => {
        appShellMock = mock<ApplicationShell>();
        appConfigMock = mock<AppConfiguration>();
        cmdMock = mock<CommandManager>();
        settings = new TestMemento();
    });

    test('Banner enabled by default', async () => {
        const banner = makeBanner();
        expect(banner.enabled).toEqual(true);

        await banner.show();
        verify(appShellMock.showInformationMessage(anyString(), anyString(), anyString(), anyString())).once();
    });

    test('Disable banner', async () => {
        const banner = makeBanner();
        await banner.disable();
        expect(settings.get(banner.settingKey)).toEqual(false);
        expect(banner.enabled).toEqual(false);

        await banner.show();
        verify(appShellMock.showInformationMessage(anyString(), anyString(), anyString(), anyString())).never();
    });

    test('Selecting No disables banner forever', async () => {
        const banner = makeBanner();
        when(appShellMock.showInformationMessage(anyString(), anyString(), anyString(), anyString())).thenReturn(
            Promise.resolve(banner.LabelNo)
        );

        await banner.show();
        expect(settings.get(banner.settingKey)).toEqual(false);
        expect(banner.enabled).toEqual(false);
    });

    test('Selecting Later disables banner in session', async () => {
        const banner = makeBanner();
        when(appShellMock.showInformationMessage(anyString(), anyString(), anyString(), anyString())).thenReturn(
            Promise.resolve(banner.LabelLater)
        );

        await banner.show();
        expect(banner.enabled).toEqual(false);
    });

    test('Selecting Yes changes python.languageServer setting and reloads window', async () => {
        const banner = makeBanner();
        when(appShellMock.showInformationMessage(anyString(), anyString(), anyString(), anyString())).thenReturn(
            Promise.resolve(banner.LabelYes)
        );

        await banner.show();
        const [setting, value] = capture(appConfigMock.updateSetting).first();
        expect(setting).toEqual('languageServer');
        expect(value).toEqual(ActivatePylanceBanner.ExpectedLanguageServer);
        verify(cmdMock.executeCommand('workbench.action.reloadWindow')).once();
    });

    test('Banner not shown when python.languageServer setting is Pylance', async () => {
        const banner = makeBanner(ActivatePylanceBanner.ExpectedLanguageServer);
        when(appShellMock.showInformationMessage(anyString(), anyString(), anyString(), anyString())).thenReturn(
            Promise.resolve(banner.LabelLater)
        );

        await banner.show();
        verify(appShellMock.showInformationMessage(anyString(), anyString(), anyString(), anyString())).never();
    });

    function makeBanner(lsType?: string): ActivatePylanceBanner {
        when(appConfigMock.getSetting<string>('languageServer')).thenReturn(lsType ?? 'Jedi');
        when(appConfigMock.updateSetting(anyString(), anything())).thenReturn(Promise.resolve());
        return new ActivatePylanceBanner(
            instance(appShellMock),
            instance(appConfigMock),
            instance(cmdMock),
            settings,
            '0.0.0'
        );
    }
});
