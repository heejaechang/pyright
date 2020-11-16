/*
 * constants.ts
 * Copyright (c) Microsoft Corporation.
 *
 * defines Version.
 */

// Not using package.json, as it may contain sensitive info.
import { pyrightCommit, version } from './metadata.json';

export const VERSION = version || '';

export const PYRIGHT_COMMIT = pyrightCommit || 'unknown';

export const IS_PRERELEASE = VERSION.indexOf('-') !== -1;
