import * as path from 'path';
import { SemVer } from 'semver';
import { anything, capture, instance, mock, verify, when } from 'ts-mockito';
import { ConfigurationChangeEvent, Progress, Uri } from 'vscode';

import * as localize from '../common/localize';
import { PersistentState, PersistentStateFactory, StateKey } from '../common/persistentState';
import { DownloadChannel, fullInsidersChannelSetting, insidersChannelSetting, InsidersImpl } from '../insiders';
import { BlobStorage, DownloadProgress, VersionedBlob } from '../insiders/blobStorage';
import { AppConfiguration } from '../types/appConfig';
import { ApplicationShell } from '../types/appShell';
import { Command, CommandManager } from '../types/commandManager';

describe('Insiders', () => {
    const downloadDir = path.resolve('downloadDir');

    let appConfig: AppConfiguration;
    let appShell: ApplicationShell;
    let currentChannelState: PersistentState<DownloadChannel | undefined>;
    let lastUpdateState: PersistentState<number | undefined>;
    let persistentState: PersistentStateFactory;
    let blobStorage: BlobStorage;
    let commandManager: CommandManager;

    beforeEach(() => {
        appConfig = mock();
        appShell = mock();

        currentChannelState = mock();
        lastUpdateState = mock();
        persistentState = mock();
        when(persistentState.createGlobalPersistentState(StateKey.InsidersCurrentChannel)).thenReturn(
            instance(currentChannelState)
        );
        when(persistentState.createGlobalPersistentState(StateKey.InsidersLastUpdate)).thenReturn(
            instance(lastUpdateState)
        );

        blobStorage = mock<BlobStorage>();
        commandManager = mock<CommandManager>();
    });

    function verifyNoCommands() {
        verify(commandManager.executeCommand(Command.ReloadWindow)).never();
        verify(commandManager.executeCommand(Command.InstallExtension, anything())).never();
    }

    async function verifyUpdate(
        run: () => Promise<void>,
        blob: VersionedBlob,
        downgrade: boolean,
        reloadPrompt: boolean
    ) {
        const vsixPath = path.join(downloadDir, blob.name);

        when(blobStorage.getLatest(downgrade)).thenResolve(blob);

        const progress: Progress<{ message?: string; increment?: number }> = mock();

        when(appShell.withProgressCustomIcon(anything(), anything())).thenCall((_icon, task) =>
            task(instance(progress))
        );

        when(blobStorage.download(blob.name, vsixPath, anything())).thenCall(
            async (_name, _vsixPath, progress?: (p: DownloadProgress) => void) => {
                expect(progress).toBeDefined();
                progress!({
                    loadedBytes: blob.contentLength! / 4,
                });
                progress!({
                    loadedBytes: blob.contentLength!,
                });
            }
        );

        if (!downgrade) {
            when(
                appShell.showInformationMessage(localize.Insiders.installedInsiders(), localize.Common.reload())
            ).thenReturn(Promise.resolve(reloadPrompt ? localize.Common.reload() : undefined));
        }

        await run();

        const [downloadReport1] = capture(progress.report).first();
        expect(downloadReport1.increment).toBe(25);
        expect(downloadReport1.message).toBe(localize.Insiders.downloadingInsiders());

        const [downloadReport2] = capture(progress.report).second();
        expect(downloadReport2.increment).toBe(75);
        expect(downloadReport2.message).toBe(localize.Insiders.downloadingInsiders());

        const [installReport] = capture(progress.report).third();
        expect(installReport.increment).toBeUndefined();
        expect(installReport.message).toBe(localize.Insiders.installingInsiders());

        const [installCommand, vsixUri] = capture<Command, Uri>(commandManager.executeCommand).first();
        expect(installCommand).toEqual(Command.InstallExtension);
        expect(vsixUri).toEqual(Uri.file(vsixPath));

        if (downgrade) {
            verify(commandManager.executeCommand(Command.ReloadWindow)).once();
        } else if (reloadPrompt) {
            verify(commandManager.executeCommand(Command.ReloadWindow)).once();
        } else {
            verify(commandManager.executeCommand(Command.ReloadWindow)).never();
        }
    }

    describe('onStartup', () => {
        test('off', async () => {
            const insiders = new InsidersImpl(
                '2020.10.1',
                downloadDir,
                instance(appConfig),
                instance(appShell),
                instance(persistentState),
                instance(blobStorage),
                instance(commandManager)
            );

            when(appConfig.getSetting<DownloadChannel>('pylance', insidersChannelSetting)).thenReturn('off');
            when(currentChannelState.value).thenReturn(undefined);

            await insiders.onStartup();

            verify(currentChannelState.updateValue('off')).once();
            verify(lastUpdateState.updateValue(undefined)).once();
            verifyNoCommands();
        });

        test('off, on prerelease, no to prompt', async () => {
            const insiders = new InsidersImpl(
                '2020.10.1-pre.1',
                downloadDir,
                instance(appConfig),
                instance(appShell),
                instance(persistentState),
                instance(blobStorage),
                instance(commandManager)
            );

            when(appConfig.getSetting<DownloadChannel>('pylance', insidersChannelSetting)).thenReturn('off');
            when(currentChannelState.value).thenReturn(undefined);
            when(
                appShell.showInformationMessage(
                    localize.Insiders.downgradeInsiders(),
                    localize.LanguageServer.turnItOn(),
                    localize.Common.no()
                )
            ).thenReturn(Promise.resolve(localize.Common.no()));

            await insiders.onStartup();

            verify(currentChannelState.updateValue('off')).once();
            verify(lastUpdateState.updateValue(undefined)).once();
            verifyNoCommands();
        });

        test('daily, with no change and not ready', async () => {
            const insiders = new InsidersImpl(
                '2020.10.1',
                downloadDir,
                instance(appConfig),
                instance(appShell),
                instance(persistentState),
                instance(blobStorage),
                instance(commandManager)
            );

            when(appConfig.getSetting<DownloadChannel>('pylance', insidersChannelSetting)).thenReturn('daily');
            when(currentChannelState.value).thenReturn('daily');
            when(lastUpdateState.value).thenReturn(Date.now());

            await insiders.onStartup();

            verify(currentChannelState.updateValue(anything())).never();
            verify(lastUpdateState.updateValue(anything())).never();
            verifyNoCommands();
        });

        test('downgrade without latest', async () => {
            const insiders = new InsidersImpl(
                '2020.10.1-pre.1',
                downloadDir,
                instance(appConfig),
                instance(appShell),
                instance(persistentState),
                instance(blobStorage),
                instance(commandManager)
            );

            when(appConfig.getSetting<DownloadChannel>('pylance', insidersChannelSetting)).thenReturn('off');
            when(currentChannelState.value).thenReturn('daily');
            when(lastUpdateState.value).thenReturn(undefined);

            when(blobStorage.getLatest(true)).thenResolve(undefined);

            await insiders.onStartup();

            verify(currentChannelState.updateValue('off')).once();
            verify(lastUpdateState.updateValue(anything())).once();
            verifyNoCommands();
        });

        test('downgrade', async () => {
            const insiders = new InsidersImpl(
                '2020.10.1-pre.1',
                downloadDir,
                instance(appConfig),
                instance(appShell),
                instance(persistentState),
                instance(blobStorage),
                instance(commandManager)
            );

            when(appConfig.getSetting<DownloadChannel>('pylance', insidersChannelSetting)).thenReturn('off');
            when(currentChannelState.value).thenReturn('off');

            when(
                appShell.showInformationMessage(
                    localize.Insiders.downgradeInsiders(),
                    localize.LanguageServer.turnItOn(),
                    localize.Common.no()
                )
            ).thenReturn(Promise.resolve(localize.LanguageServer.turnItOn()));

            const blob: VersionedBlob = {
                name: 'vscode-pylance-2020.10.1.vsix',
                version: new SemVer('2020.10.1'),
                contentLength: 128,
            };

            await verifyUpdate(async () => await insiders.onStartup(), blob, true, false);
        });

        test('no downgrade for dev build', async () => {
            const insiders = new InsidersImpl(
                '2020.10.1-dev.1',
                downloadDir,
                instance(appConfig),
                instance(appShell),
                instance(persistentState),
                instance(blobStorage),
                instance(commandManager)
            );

            when(appConfig.getSetting<DownloadChannel>('pylance', insidersChannelSetting)).thenReturn('off');
            when(currentChannelState.value).thenReturn('off');

            await insiders.onStartup();

            verify(
                appShell.showInformationMessage(
                    localize.Insiders.downgradeInsiders(),
                    localize.LanguageServer.turnItOn(),
                    localize.Common.no()
                )
            ).never();
        });

        test('daily, and ready to check', async () => {
            const insiders = new InsidersImpl(
                '2020.10.1',
                downloadDir,
                instance(appConfig),
                instance(appShell),
                instance(persistentState),
                instance(blobStorage),
                instance(commandManager)
            );

            when(appConfig.getSetting<DownloadChannel>('pylance', insidersChannelSetting)).thenReturn('daily');
            when(currentChannelState.value).thenReturn('daily');
            when(lastUpdateState.value).thenReturn(0);

            when(
                appShell.showInformationMessage(
                    localize.Insiders.downgradeInsiders(),
                    localize.LanguageServer.turnItOn(),
                    localize.Common.no()
                )
            ).thenReturn(Promise.resolve(localize.LanguageServer.turnItOn()));

            const blob: VersionedBlob = {
                name: 'vscode-pylance-2020.10.2-pre.1.vsix',
                version: new SemVer('2020.10.2-pre.1'),
                contentLength: 128,
            };

            await verifyUpdate(async () => await insiders.onStartup(), blob, false, false);
        });
    });

    describe('onChange', () => {
        let event: ConfigurationChangeEvent;
        beforeEach(() => {
            event = mock();
        });

        test('change does not affect insidersChannel', async () => {
            const insiders = new InsidersImpl(
                '2020.10.1',
                downloadDir,
                instance(appConfig),
                instance(appShell),
                instance(persistentState),
                instance(blobStorage),
                instance(commandManager)
            );

            when(event.affectsConfiguration(fullInsidersChannelSetting)).thenReturn(false);

            await insiders.onChange(instance(event));

            verify(currentChannelState.updateValue(anything())).never();
            verify(lastUpdateState.updateValue(anything())).never();
            verifyNoCommands();
        });

        test('no settings change', async () => {
            const insiders = new InsidersImpl(
                '2020.10.1',
                downloadDir,
                instance(appConfig),
                instance(appShell),
                instance(persistentState),
                instance(blobStorage),
                instance(commandManager)
            );

            when(event.affectsConfiguration(fullInsidersChannelSetting)).thenReturn(true);
            when(appConfig.getSetting<DownloadChannel>('pylance', insidersChannelSetting)).thenReturn('daily');
            when(currentChannelState.value).thenReturn('daily');

            await insiders.onChange(instance(event));

            verify(currentChannelState.updateValue(anything())).never();
            verify(lastUpdateState.updateValue(anything())).never();
            verifyNoCommands();
        });

        test('downgrade', async () => {
            const insiders = new InsidersImpl(
                '2020.10.1-pre.1',
                downloadDir,
                instance(appConfig),
                instance(appShell),
                instance(persistentState),
                instance(blobStorage),
                instance(commandManager)
            );

            when(event.affectsConfiguration(fullInsidersChannelSetting)).thenReturn(true);
            when(appConfig.getSetting<DownloadChannel>('pylance', insidersChannelSetting)).thenReturn('off');
            when(currentChannelState.value).thenReturn('daily');

            when(
                appShell.showInformationMessage(
                    localize.Insiders.downgradeInsiders(),
                    localize.LanguageServer.turnItOn(),
                    localize.Common.no()
                )
            ).thenReturn(Promise.resolve(localize.LanguageServer.turnItOn()));

            const blob: VersionedBlob = {
                name: 'vscode-pylance-2020.10.1.vsix',
                version: new SemVer('2020.10.1'),
                contentLength: 128,
            };

            await verifyUpdate(async () => await insiders.onChange(instance(event)), blob, true, false);
        });

        test('downgrade, no to prompt', async () => {
            const insiders = new InsidersImpl(
                '2020.10.1-pre.1',
                downloadDir,
                instance(appConfig),
                instance(appShell),
                instance(persistentState),
                instance(blobStorage),
                instance(commandManager)
            );

            when(event.affectsConfiguration(fullInsidersChannelSetting)).thenReturn(true);
            when(appConfig.getSetting<DownloadChannel>('pylance', insidersChannelSetting)).thenReturn('off');
            when(currentChannelState.value).thenReturn('daily');

            when(
                appShell.showInformationMessage(
                    localize.Insiders.downgradeInsiders(),
                    localize.LanguageServer.turnItOn(),
                    localize.Common.no()
                )
            ).thenReturn(Promise.resolve(localize.LanguageServer.turnItOn()));

            const blob: VersionedBlob = {
                name: 'vscode-pylance-2020.10.1.vsix',
                version: new SemVer('2020.10.1'),
                contentLength: 128,
            };

            await insiders.onChange(instance(event));

            await verifyUpdate(async () => await insiders.onChange(instance(event)), blob, true, true);
        });

        test('upgrade', async () => {
            const insiders = new InsidersImpl(
                '2020.10.1-pre.1',
                downloadDir,
                instance(appConfig),
                instance(appShell),
                instance(persistentState),
                instance(blobStorage),
                instance(commandManager)
            );

            when(event.affectsConfiguration(fullInsidersChannelSetting)).thenReturn(true);
            when(appConfig.getSetting<DownloadChannel>('pylance', insidersChannelSetting)).thenReturn('daily');
            when(currentChannelState.value).thenReturn('off');
            when(lastUpdateState.value).thenReturn(0);

            const blob: VersionedBlob = {
                name: 'vscode-pylance-2020.10.1-pre.2.vsix',
                version: new SemVer('2020.10.1-pre.2'),
                contentLength: 128,
            };

            await insiders.onChange(instance(event));

            await verifyUpdate(async () => await insiders.onChange(instance(event)), blob, false, false);
        });
    });
});
