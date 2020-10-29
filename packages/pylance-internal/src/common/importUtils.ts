/*
 * importUtils.ts
 *
 * Well known Abbreviation Map for auto import and add import.
 */

import { AbbreviationInfo } from 'pyright-internal/languageService/autoImporter';

// We'll use a somewhat-arbitrary cutoff value here to determine
// whether it's sufficiently similar. We use a little bit higher number than auto import
// to reduce the number of code actions shown
export const addImportSimilarityLimit = 0.4;

export const wellKnownAbbreviationMap = new Map<string, AbbreviationInfo>([
    ['np', { importName: 'numpy' }],
    ['pd', { importName: 'pandas' }],
    ['tf', { importName: 'tensorflow' }],
    ['plt', { importName: 'pyplot', importFrom: 'matplotlib' }],
    ['mpl', { importName: 'matplotlib' }],
    ['m', { importName: 'math' }],
    ['spio', { importName: 'io', importFrom: 'scipy' }],
    ['sp', { importName: 'scipy' }],
    ['pn', { importName: 'panel' }],
    ['hv', { importName: 'holoviews' }],
]);
