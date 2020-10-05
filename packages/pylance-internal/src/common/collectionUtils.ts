/*
 * collectionUtils.ts
 * Copyright (c) Microsoft Corporation.
 *
 * Helper functions around collections.
 */

import { ConfigOptions, ExecutionEnvironment } from 'pyright-internal/common/configOptions';

export function getOrAdd<K, V>(map: Map<K, V>, key: K, newValueFactory: () => V): V {
    const value = map.get(key);
    if (value !== undefined) {
        return value;
    }

    const newValue = newValueFactory();
    map.set(key, newValue);

    return newValue;
}

export function deleteElement<T>(arr: T[], element: T) {
    const index = arr.findIndex((e) => e === element);
    if (index < 0) {
        return;
    }

    arr.splice(index, 1);
}

export function getExecutionEnvironments(configOptions: ConfigOptions) {
    if (configOptions.executionEnvironments.length > 0) {
        return configOptions.executionEnvironments;
    }

    return [
        new ExecutionEnvironment(
            configOptions.projectRoot,
            configOptions.defaultPythonVersion,
            configOptions.defaultPythonPlatform
        ),
    ];
}
