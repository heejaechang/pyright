import * as fs from 'fs';
import * as path from 'path';
import { anyString, anything, capture, instance, mock, verify, when } from 'ts-mockito';
import { ConfigurationTarget, OutputChannel } from 'vscode';

import { LanguageServer } from '../common/localize';
import { LanguageServerSettingName, PylanceName } from '../common/utils';
import { migrateSetting, migrateV1Settings, settingsMigrationMap } from '../settingsMigration';
import { AppConfiguration } from '../types/appConfig';
import { ApplicationShell } from '../types/appShell';

describe('Settings migration', () => {
    let appConfigMock: AppConfiguration;
    let appShell: ApplicationShell;
    let outputChannel: OutputChannel;
    const value = 'value';

    beforeEach(() => {
        appConfigMock = mock<AppConfiguration>();
        appShell = mock<ApplicationShell>();
        outputChannel = mock<OutputChannel>();
        when(appShell.createOutputChannel(anyString())).thenReturn(instance(outputChannel));
    });

    test(`Verify target settings are in package.json`, async () => {
        const json = getPackageJson();

        expect(json).toBeDefined();
        expect(json.contributes).toBeDefined();
        expect(json.contributes.configuration).toBeDefined();
        expect(json.contributes.configuration.properties).toBeDefined();
        const props = json.contributes.configuration.properties;

        for (const [_, to] of Array.from(settingsMigrationMap.entries())) {
            const propName = `python.${to}`;
            if (!props[propName]) {
                fail(`'${propName}' is not in package.json`);
            }
        }
    });

    test('Do nothing if Pylance is not default language server', async () => {
        await migrateV1Settings(instance(appConfigMock), instance(appShell));
        verify(appConfigMock.updateSetting(anything(), anyString(), anything(), anything())).never();
        verify(appShell.showInformationMessage(anyString())).never();
    });

    for (const [from, to] of Array.from(settingsMigrationMap.entries())) {
        for (const globalValue of [undefined, value]) {
            for (const workspaceValue of [undefined, value]) {
                for (const workspaceFolderValue of [undefined, value]) {
                    // Test all combinations of global, workspace and folder settings.
                    test(`Do nothing if ${from} is already migrated with global = ${globalValue}, workspace = ${workspaceValue}, folder = ${workspaceFolderValue}`, async () => {
                        when(appConfigMock.inspect<any>('python', anyString())).thenCall((arg: string) => {
                            return arg === to
                                ? {
                                      key: to,
                                      globalValue,
                                      workspaceValue,
                                      workspaceFolderValue,
                                  }
                                : undefined;
                        });
                        await migrateSetting(from, to, instance(appConfigMock));
                        verify(appConfigMock.updateSetting(anything(), anyString(), anything(), anything())).never();
                    });
                }
            }
        }
    }

    for (const [from, to] of Array.from(settingsMigrationMap.entries())) {
        for (const globalValue of [undefined, value]) {
            for (const workspaceValue of [undefined, value]) {
                for (const workspaceFolderValue of [undefined, value]) {
                    // Test all combinations of global, workspace and folder settings.
                    test(`Migrate ${from} to ${to} with global = ${globalValue}, workspace = ${workspaceValue}, folder = ${workspaceFolderValue}`, async () => {
                        when(appConfigMock.inspect<any>('python', anyString())).thenCall(
                            (_section: string, arg: string) => {
                                if (arg === to) {
                                    return undefined;
                                }
                                if (arg === from) {
                                    return {
                                        key: from,
                                        globalValue,
                                        workspaceValue,
                                        workspaceFolderValue,
                                    };
                                }
                                return undefined;
                            }
                        );

                        await migrateSetting(from, to, instance(appConfigMock));

                        if (workspaceFolderValue) {
                            verifyUpdate(to, ConfigurationTarget.WorkspaceFolder, appConfigMock);
                        } else {
                            verifyNotUpdated(ConfigurationTarget.WorkspaceFolder);
                            if (workspaceValue) {
                                verifyUpdate(to, ConfigurationTarget.Workspace, appConfigMock);
                            } else {
                                verifyNotUpdated(ConfigurationTarget.Workspace);
                                if (globalValue) {
                                    verifyUpdate(to, ConfigurationTarget.Global, appConfigMock);
                                } else {
                                    verifyNotUpdated(ConfigurationTarget.Global);
                                }
                            }
                        }
                    });
                }
            }
        }
    }

    for (const globalValue of [undefined, value]) {
        for (const workspaceValue of [undefined, value]) {
            for (const workspaceFolderValue of [undefined, value]) {
                test(`Verify informational message is logged after migration with global = ${globalValue}, workspace = ${workspaceValue}, folder = ${workspaceFolderValue}`, async () => {
                    when(appConfigMock.getSetting<string>('python', LanguageServerSettingName)).thenReturn(PylanceName);
                    // Even calls are for 'to' and odd calls are for 'from'
                    let call = 0;
                    when(appConfigMock.inspect<any>('python', anyString())).thenCall((arg: string) => {
                        return call++ & 1
                            ? {
                                  key: arg,
                                  globalValue,
                                  workspaceValue,
                                  workspaceFolderValue,
                              }
                            : undefined;
                    });

                    await migrateV1Settings(instance(appConfigMock), instance(appShell));

                    expect(call).toEqual(Array.from(settingsMigrationMap.entries()).length * 2);

                    if (globalValue || workspaceValue || workspaceFolderValue) {
                        verify(outputChannel.appendLine(LanguageServer.settingsMigratedMessage())).once();
                    } else {
                        verify(outputChannel.appendLine(anyString())).never();
                    }
                });
            }
        }
    }

    test(`Verify error is logged if update setting throws`, async () => {
        const entries = Array.from(settingsMigrationMap.entries());
        const tos = entries.map(([_, to]) => to);

        when(appConfigMock.getSetting<string>('python', LanguageServerSettingName)).thenReturn(PylanceName);
        when(appConfigMock.inspect<any>('python', anyString())).thenCall((_section: string, arg: string) => {
            if (tos.includes(arg)) {
                return undefined;
            }
            return {
                key: arg,
                globalValue: value,
            };
        });
        when(appConfigMock.updateSetting('python', anyString(), anything(), anything())).thenThrow({
            name: 'error',
            message: 'message',
        });

        await migrateV1Settings(instance(appConfigMock), instance(appShell));
        verify(outputChannel.appendLine(LanguageServer.settingsMigrationError())).once();

        const errors = tos.map((to) => `${to} (message)`);
        const message = `    ${errors.join()}`;
        verify(outputChannel.appendLine(message)).once();
    });

    function verifyUpdate(name: string, target: ConfigurationTarget, appConfigMock: AppConfiguration) {
        const [section, n, v, tgt] = capture(appConfigMock.updateSetting).first();
        expect(section).toEqual('python');
        expect(n).toEqual(name);
        expect(v).toEqual(value);
        expect(tgt).toEqual(target);
    }

    function verifyNotUpdated(target: ConfigurationTarget): void {
        verify(appConfigMock.updateSetting(anything(), anyString(), anything(), target)).never();
    }

    function getPackageJson(): any {
        const extensionRoot = path.resolve(__dirname, '..', '..');
        const packageJson = path.join(extensionRoot, 'package.json');
        const jsonString = fs.readFileSync(packageJson, { encoding: 'utf-8' });
        return JSON.parse(jsonString);
    }
});
