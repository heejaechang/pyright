#!/usr/bin/env node

// This script helps build the command-line version of pyrx
// by copying the typeshed-fallback directory to the dist directory.

/* eslint-disable @typescript-eslint/no-var-requires */
const fsExtra = require('fs-extra');

// Production mode
fsExtra.emptyDirSync('../dist/typeshed-fallback');
fsExtra.copySync('./typeshed-fallback', '../dist/typeshed-fallback');

// Debug mode
fsExtra.emptyDirSync('../client/server/typeshed-fallback');
fsExtra.copySync('./typeshed-fallback', '../client/server/typeshed-fallback');
