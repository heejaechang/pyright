/*
 * collectionUtils.ts
 * Copyright (c) Microsoft Corporation.
 *
 * Helper functions around collections.
 */

export function deleteElement<T>(arr: T[], element: T) {
    const index = arr.findIndex((e) => e === element);
    if (index < 0) {
        return;
    }

    arr.splice(index, 1);
}
