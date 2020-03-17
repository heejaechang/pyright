#!/usr/bin/env node

// This script helps build the command-line version of pyrx
// by copying the bundled-stubs directory to the dist directory.

/* eslint-disable @typescript-eslint/no-var-requires */
const fsExtra = require('fs-extra');

// Production mode
fsExtra.emptyDirSync('../dist/bundled-stubs');
fsExtra.copySync('./bundled-stubs', '../dist/bundled-stubs');

// Debug mode
fsExtra.emptyDirSync('../client/server/bundled-stubs');
fsExtra.copySync('./bundled-stubs', '../client/server/bundled-stubs');
