#!/usr/bin/env node

// This script helps build the command-line version of pylance
// by copying the typeshed-fallback directory to the dist directory.

/* eslint-disable @typescript-eslint/no-var-requires */
const fsExtra = require('fs-extra');

// Production mode
fsExtra.emptyDirSync('../extension/server/typeshed-fallback');
fsExtra.copySync('./typeshed-fallback', '../extension/server/typeshed-fallback');

// Debug mode
fsExtra.emptyDirSync('../client/server/typeshed-fallback');
fsExtra.copySync('./typeshed-fallback', '../client/server/typeshed-fallback');
