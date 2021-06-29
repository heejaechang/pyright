import { Uri } from 'vscode';

import { AppConfiguration } from '../types/appConfig';

export async function addToExtraPaths(appConfig: AppConfiguration, filePath: string, toAdd: string) {
    const config = appConfig.getConfiguration('python.analysis', Uri.file(filePath));
    const extraPaths = config.get('extraPaths');

    const newExtraPaths = Array.isArray(extraPaths) ? [...extraPaths] : [];
    newExtraPaths.push(toAdd);

    await config.update('extraPaths', newExtraPaths);
}
