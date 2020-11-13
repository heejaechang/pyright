import { anyString, anything, capture, instance, mock, verify, when } from 'ts-mockito';
import { ConfigurationTarget, Memento } from 'vscode';

import { ActivatePylanceBanner } from '../banners';
import { PylanceName } from '../common/utils';
import { AppConfiguration } from '../types/appConfig';
import { ApplicationShell } from '../types/appShell';
import { Command, CommandManager } from '../types/commandManager';
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

    interface TestData {
        globalValue?: string;
        workspaceValue?: string;
        expectedTarget: ConfigurationTarget;
        location: string;
        targetName: string;
    }
    const testData: TestData[] = [
        {
            globalValue: undefined,
            workspaceValue: undefined,
            expectedTarget: ConfigurationTarget.Global,
            location: 'not specified',
            targetName: 'global',
        },
        {
            globalValue: 'Microsoft',
            workspaceValue: undefined,
            expectedTarget: ConfigurationTarget.Global,
            location: 'specified in global',
            targetName: 'global',
        },
        {
            globalValue: undefined,
            workspaceValue: 'Microsoft',
            expectedTarget: ConfigurationTarget.Workspace,
            location: 'specified in workspace',
            targetName: 'workspace',
        },
        {
            globalValue: 'Microsoft',
            workspaceValue: 'Microsoft',
            expectedTarget: ConfigurationTarget.Workspace,
            location: 'specified in both global and workspace',
            targetName: 'workspace',
        },
    ];

    testData.forEach((s) => {
        test(`Selecting Yes when python.languageServer ${s.location} changes setting in ${s.targetName} and reloads window`, async () => {
            const banner = makeBanner();
            when(appShellMock.showInformationMessage(anyString(), anyString(), anyString(), anyString())).thenReturn(
                Promise.resolve(banner.LabelYes)
            );

            when(appConfigMock.inspect<string | undefined>('python', 'languageServer')).thenReturn({
                key: 'languageServer',
                globalValue: s.globalValue,
                workspaceValue: s.workspaceValue,
            });

            await banner.show();
            const [section, setting, value, target] = capture(appConfigMock.updateSetting).first();
            expect(section).toEqual('python');
            expect(setting).toEqual('languageServer');
            expect(value).toEqual(PylanceName);
            expect(target).toEqual(s.expectedTarget);
            verify(cmdMock.executeCommand(Command.ReloadWindow)).once();
        });
    });

    test('Banner not shown when python.languageServer setting is Pylance', async () => {
        const banner = makeBanner(PylanceName);
        when(appShellMock.showInformationMessage(anyString(), anyString(), anyString(), anyString())).thenReturn(
            Promise.resolve(banner.LabelLater)
        );

        await banner.show();
        verify(appShellMock.showInformationMessage(anyString(), anyString(), anyString(), anyString())).never();
    });

    function makeBanner(lsType?: string): ActivatePylanceBanner {
        when(appConfigMock.getSetting<string>('python', 'languageServer')).thenReturn(lsType ?? 'Jedi');
        when(appConfigMock.updateSetting('python', anyString(), anything())).thenReturn(Promise.resolve());
        return new ActivatePylanceBanner(
            instance(appShellMock),
            instance(appConfigMock),
            instance(cmdMock),
            settings,
            '0.0.0'
        );
    }
});
