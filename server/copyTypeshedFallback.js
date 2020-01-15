#!/usr/bin/env node

// This script helps build the command-line version of pyright
// by copying the typeshed-fallback directory to the dist directory.

/* eslint-disable @typescript-eslint/no-var-requires */
const fsExtra = require('fs-extra');

// No need for this in production since webpack copy plugin takes care of copying
// Debug mode
fsExtra.emptyDirSync('../client/typeshed-fallback');
fsExtra.copySync('./pyright/client/typeshed-fallback', '../client/server/pyright/server/typeshed-fallback');

