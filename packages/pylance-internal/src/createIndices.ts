// This script MUST be run via ts-node for paths to resolve properly.

import * as path from 'path';

// Pretend we're pyright to resolve typeshed. This is a hack to not need to webpack
// this script to have paths resolve.
(global as any).__rootDirectory = path.resolve(__dirname, '..', '..', 'pyright', 'packages', 'pyright-internal');

import { ImportResolver } from 'pyright-internal/analyzer/importResolver';
import { ConfigOptions } from 'pyright-internal/common/configOptions';
import { StandardConsole } from 'pyright-internal/common/console';
import { createFromRealFileSystem } from 'pyright-internal/common/fileSystem';

import { Indexer } from './services/indexer';

const fs = createFromRealFileSystem();
const configOptions = new ConfigOptions('.');
const importResolver = new ImportResolver(fs, configOptions);
const console = new StandardConsole();

const stdlibPath = path.resolve(__dirname, '..', 'bundled-indices', 'stdlib.json');

Indexer.generateStdLibIndices(importResolver, console, stdlibPath);
