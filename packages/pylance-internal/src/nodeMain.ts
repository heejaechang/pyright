import { run } from 'pyright-internal/nodeServer';

import { runBackgroundThread } from './backgroundAnalysis';
import { IntelliCodeExtension } from './intelliCode/extension';
import { PylanceServer } from './server';

export function main() {
    run((conn) => {
        const intelliCode = new IntelliCodeExtension();
        new PylanceServer(conn, intelliCode);
    }, runBackgroundThread);
}
