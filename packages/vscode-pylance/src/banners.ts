// Base class for a popup (banner) that proposes user to try out a new feature of
// the extension, and optionally enable that new feature if they choose to do so.

import { Memento } from 'vscode';

export abstract class BannerBase {
    protected disabledInCurrentSession = false;

    constructor(private readonly settingName: string, protected readonly memento: Memento) {}

    get enabled(): boolean {
        return this.disabledInCurrentSession ? false : this.memento.get(this.settingName, true);
    }

    async disable(): Promise<void> {
        return this.memento.update(this.settingName, false);
    }

    abstract show(): Promise<void>;
}
