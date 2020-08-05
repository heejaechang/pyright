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

export interface AppConfiguration {
    getSetting<T = undefined>(name: string): T | undefined;
    updateSetting(name: string, value: any, target?: ConfigurationTarget): Promise<void>;
    inspect<T = undefined>(key: string): SettingInspection<T | undefined> | undefined;
}

export class AppConfigurationImpl implements AppConfiguration {
    getSetting<T = undefined>(name: string): T | undefined {
        return this.pythonConfig.get<T>(name);
    }
    async updateSetting(name: string, value: any, target?: ConfigurationTarget): Promise<void> {
        await this.pythonConfig.update(name, value, target);
    }
    inspect<T = undefined>(key: string): SettingInspection<T | undefined> | undefined {
        return this.pythonConfig.inspect<T>(key);
    }
    private get pythonConfig(): WorkspaceConfiguration {
        return workspace.getConfiguration('python');
    }
}
