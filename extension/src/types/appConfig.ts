import { ConfigurationTarget, workspace } from 'vscode';

export interface AppConfiguration {
    getSetting<T = undefined>(name: string): T | undefined;
    updateSetting(name: string, value: any, target?: ConfigurationTarget): Promise<void>;
}

export class AppConfigurationImpl implements AppConfiguration {
    getSetting<T = undefined>(name: string): T | undefined {
        return workspace.getConfiguration('python')?.get<T>(name);
    }
    async updateSetting(name: string, value: any, target?: ConfigurationTarget): Promise<void> {
        await workspace.getConfiguration('python')?.update(name, value, target);
    }
}
