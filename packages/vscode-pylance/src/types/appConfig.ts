import { ConfigurationTarget, workspace, WorkspaceConfiguration } from 'vscode';

export interface SettingInspection<T> {
    key: string;

    defaultValue?: T;
    globalValue?: T;
    workspaceValue?: T;
    workspaceFolderValue?: T;

    defaultLanguageValue?: T;
    globalLanguageValue?: T;
    workspaceLanguageValue?: T;
    workspaceFolderLanguageValue?: T;

    languageIds?: string[];
}

export type Section = 'python' | 'pylance';

export interface AppConfiguration {
    getSetting<T = undefined>(section: Section, name: string): T | undefined;
    updateSetting(section: Section, name: string, value: any, target?: ConfigurationTarget): Promise<void>;
    inspect<T = undefined>(section: Section, key: string): SettingInspection<T | undefined> | undefined;
}

export class AppConfigurationImpl implements AppConfiguration {
    getSetting<T = undefined>(section: Section, name: string): T | undefined {
        return workspace.getConfiguration(section).get<T>(name);
    }
    async updateSetting(section: Section, name: string, value: any, target?: ConfigurationTarget): Promise<void> {
        await workspace.getConfiguration(section).update(name, value, target);
    }
    inspect<T = undefined>(section: Section, key: string): SettingInspection<T | undefined> | undefined {
        return workspace.getConfiguration(section).inspect<T>(key);
    }
}
