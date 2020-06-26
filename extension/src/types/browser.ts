import { env, Uri } from 'vscode';

export interface BrowserService {
    launch(url: string): void;
}

export function launch(url: string) {
    env.openExternal(Uri.parse(url));
}

export class BrowserServiceImpl implements BrowserService {
    public launch(url: string): void {
        launch(url);
    }
}
