import { Memento } from 'vscode';

export enum StateKey {
    InsidersCurrentChannel = 'insidersChannel',
    InsidersLastUpdate = 'insidersLastUpdate',
}

// Pulled from vscode-python, but modified to better handle the "unset" case (where defaultValue is set to undefined).
export interface PersistentState<T> {
    readonly value: T | undefined;
    updateValue(value: T): Promise<void>;
}

export class PersistentStateImpl<T> implements PersistentState<T> {
    constructor(
        private storage: Memento,
        private key: StateKey,
        private defaultValue?: T,
        private expiryDurationMs?: number
    ) {}

    public get value(): T | undefined {
        if (this.expiryDurationMs) {
            const cachedData = this.storage.get<{ data?: T; expiry?: number }>(this.key, { data: this.defaultValue });
            if (!cachedData || !cachedData.expiry || cachedData.expiry < Date.now()) {
                return this.defaultValue;
            } else {
                return cachedData.data;
            }
        } else {
            return this.storage.get(this.key, this.defaultValue);
        }
    }

    public async updateValue(newValue: T): Promise<void> {
        if (this.expiryDurationMs) {
            await this.storage.update(this.key, { data: newValue, expiry: Date.now() + this.expiryDurationMs });
        } else {
            await this.storage.update(this.key, newValue);
        }
    }
}

export interface PersistentStateFactory {
    createGlobalPersistentState<T>(key: StateKey, defaultValue?: T, expiryDurationMs?: number): PersistentState<T>;
    createWorkspacePersistentState<T>(key: StateKey, defaultValue?: T, expiryDurationMs?: number): PersistentState<T>;
}

export class PersistentStateFactoryImpl implements PersistentStateFactory {
    constructor(private globalState: Memento, private workspaceState: Memento) {}
    public createGlobalPersistentState<T>(
        key: StateKey,
        defaultValue?: T,
        expiryDurationMs?: number
    ): PersistentState<T> {
        return new PersistentStateImpl<T>(this.globalState, key, defaultValue, expiryDurationMs);
    }
    public createWorkspacePersistentState<T>(
        key: StateKey,
        defaultValue?: T,
        expiryDurationMs?: number
    ): PersistentState<T> {
        return new PersistentStateImpl<T>(this.workspaceState, key, defaultValue, expiryDurationMs);
    }
}
