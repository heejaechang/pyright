#!/usr/bin/env node

// This script helps build the command-line version of pyright
// by copying the typeshed-fallback directory to the dist directory.

/* eslint-disable @typescript-eslint/no-var-requires */
const fsExtra = require('fs-extra');

// Production mode
fsExtra.emptyDirSync('../dist/typeshed-fallback');
fsExtra.copySync('./pyright/client/typeshed-fallback', '../dist/typeshed-fallback');

// Debug mode
fsExtra.emptyDirSync('../client/typeshed-fallback');
fsExtra.copySync('./pyright/client/typeshed-fallback', '../client/server/typeshed-fallback');
