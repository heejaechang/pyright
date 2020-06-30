import { anyString, capture, instance, mock, verify, when } from 'ts-mockito';
import { Memento } from 'vscode';

import { PylanceSurveyBanner } from '../banners';
import { ApplicationShell } from '../types/appShell';
import { BrowserService } from '../types/browser';
import { TestMemento } from './testUtil';

let appShellMock: ApplicationShell;
let browserMock: BrowserService;
let settings: Memento;

const version = '0.0.1';

describe('Pylance survey', () => {
    beforeEach(() => {
        appShellMock = mock<ApplicationShell>();
        browserMock = mock<BrowserService>();
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
        expect(settings.get(PylanceSurveyBanner.SettingKey)).toEqual(false);
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
        expect(settings.get(PylanceSurveyBanner.SettingKey)).toEqual(false);
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

    test('Selecting Yes launches survey and then disables it', async () => {
        const banner = makeBanner();
        when(appShellMock.showInformationMessage(anyString(), anyString(), anyString(), anyString())).thenReturn(
            Promise.resolve(banner.LabelYes)
        );

        await banner.show();
        const [url] = capture(browserMock.launch).first();
        expect(url).toEqual(banner.getSurverUrl(1, version));
        expect(banner.enabled).toEqual(false);
        expect(settings.get(PylanceSurveyBanner.SettingKey)).toEqual(false);
    });

    test('Banner not shown before threshold', async () => {
        const banner = new PylanceSurveyBanner(instance(appShellMock), instance(browserMock), settings, version, 3, 3);
        await banner.show();
        verify(appShellMock.showInformationMessage(anyString(), anyString(), anyString(), anyString())).never();
        await banner.show();
        verify(appShellMock.showInformationMessage(anyString(), anyString(), anyString(), anyString())).never();
        await banner.show();
        verify(appShellMock.showInformationMessage(anyString(), anyString(), anyString(), anyString())).once();
    });

    function makeBanner(): PylanceSurveyBanner {
        return new PylanceSurveyBanner(instance(appShellMock), instance(browserMock), settings, version, 0, 0);
    }
});
