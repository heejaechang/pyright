import { Memento } from 'vscode';

export class TestMemento implements Memento {
    private readonly map = new Map<any, any>();

    get<T>(key: string): T | undefined;
    get<T>(key: string, defaultValue: T): T;
    get(key: any, defaultValue?: any) {
        const v = this.map.get(key);
        return v === undefined ? defaultValue : v;
    }

    update(key: string, value: any): Thenable<void> {
        this.map.set(key, value);
        return Promise.resolve();
    }
}
