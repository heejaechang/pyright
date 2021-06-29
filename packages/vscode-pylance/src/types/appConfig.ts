import { ConfigurationScope, ConfigurationTarget, workspace, WorkspaceConfiguration } from 'vscode';

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

export interface AppConfiguration {
    getSetting<T = unknown>(section: string, name: string, scope?: ConfigurationScope | null): T | undefined;
    updateSetting(section: string, name: string, value: any, target?: ConfigurationTarget): Promise<void>;
    inspect<T = unknown>(section: string, key: string): SettingInspection<T | undefined> | undefined;

    // WorkspaceConfiguration remembers the scope it was produced from, for future update calls.
    getConfiguration(section: string, scope?: ConfigurationScope | null): WorkspaceConfiguration;
}

export class AppConfigurationImpl implements AppConfiguration {
    getSetting<T = unknown>(section: string, name: string): T | undefined {
        return workspace.getConfiguration(section).get<T>(name);
    }
    async updateSetting(section: string, name: string, value: any, target?: ConfigurationTarget): Promise<void> {
        await workspace.getConfiguration(section).update(name, value, target);
    }
    inspect<T = unknown>(section: string, key: string): SettingInspection<T | undefined> | undefined {
        return workspace.getConfiguration(section).inspect<T>(key);
    }
    getConfiguration(section: string, scope?: ConfigurationScope | null): WorkspaceConfiguration {
        return workspace.getConfiguration(section, scope);
    }
}
