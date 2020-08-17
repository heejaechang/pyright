import { ConfigurationTarget } from 'vscode';

import { LanguageServer } from './common/localize';
import { isPylanceDefaultLanguageServer, PylanceName } from './common/utils';
import { AppConfiguration } from './types/appConfig';
import { ApplicationShell } from './types/appShell';

export const settingsMigrationMap = new Map<string, string>([
    ['autoComplete.extraPaths', 'analysis.extraPaths'],
    // Update does not accept target name if it is not in project.json.
    // TODO: Uncomment when feature is implemented.
    // ['autoComplete.addBrackets', 'analysis.completeFunctionParens'],
]);

export async function migrateV1Settings(config: AppConfiguration, shell: ApplicationShell): Promise<void> {
    if (!isPylanceDefaultLanguageServer(config)) {
        return;
    }

    // Try-catch in case destination is not known to VS Code.
    let migrated = false;
    const errors: string[] = [];
    for (const [from, to] of Array.from(settingsMigrationMap.entries())) {
        try {
            if (await migrateSetting(from, to, config)) {
                migrated = true;
            }
        } catch (e) {
            errors.push(`${to} (${e.message})`);
        }
    }

    const outputChannel = shell.createOutputChannel(PylanceName);
    if (migrated) {
        outputChannel.appendLine(LanguageServer.settingsMigratedMessage());
    }
    if (errors.length > 0) {
        outputChannel.appendLine(LanguageServer.settingsMigrationError());
        outputChannel.appendLine(`    ${errors.join()}`);
    }
}

export async function migrateSetting(fromName: string, toName: string, config: AppConfiguration): Promise<boolean> {
    const toSetting = config.inspect<any>(toName);
    if (
        toSetting?.globalValue !== undefined ||
        toSetting?.workspaceValue !== undefined ||
        toSetting?.workspaceFolderValue !== undefined
    ) {
        return false; // Already migrated or otherwise exists.
    }

    const fromSetting = config.inspect<any>(fromName);
    if (!fromSetting) {
        return false; // Nothing to migrate.
    }
    // Migrate existing setting per scope.
    let target: ConfigurationTarget | undefined;
    let value: any;

    if (fromSetting.workspaceFolderValue !== undefined) {
        target = ConfigurationTarget.WorkspaceFolder;
        value = fromSetting.workspaceFolderValue;
    } else if (fromSetting.workspaceValue !== undefined) {
        target = ConfigurationTarget.Workspace;
        value = fromSetting.workspaceValue;
    } else if (fromSetting.globalValue !== undefined) {
        target = ConfigurationTarget.Global;
        value = fromSetting.globalValue;
    }

    if (target && value) {
        await config.updateSetting(toName, value, target);
        return true;
    }
    return false;
}
