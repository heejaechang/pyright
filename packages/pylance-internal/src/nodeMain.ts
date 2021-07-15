import { run } from 'pyright-internal/nodeServer';

import { runBackgroundThread } from './backgroundAnalysis';
import { PylanceServer } from './server';

export function main() {
    run((conn) => new PylanceServer(conn), runBackgroundThread);
}
