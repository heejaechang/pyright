/*
 * mainModuleFileName.ts
 * Copyright (c) Microsoft Corporation.
 *
 * define main module filename.
 */

// process.mainModule is "doc-only deprecated" in Node v14+.
const mainModule = (process as any).mainModule;
export const mainFilename: string = mainModule ? mainModule.filename ?? undefined : undefined;
