/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import querystring from 'querystring';
import * as vscode from 'vscode';

import { BrowserService } from '../types/browser';

const issuesUrl = 'https://github.com/microsoft/pylance-release/issues/new';

export default function reportIssue(browser: BrowserService, extensionVersion: string) {
    vscode.commands.executeCommand('python.viewLanguageServerOutput').then(() => {
        setTimeout(() => {
            _reportIssue(browser, extensionVersion);
        }, 1000);
    });
}

function _reportIssue(browser: BrowserService, extensionVersion: string) {
    const platform = process.platform;
    const arch = process.arch;
    const pythonConfig = vscode.workspace.getConfiguration('python');
    const indexing = pythonConfig.get('analysis.indexing');
    const typeCheckingMode = pythonConfig.get('analysis.typeCheckingMode');

    // Assumes caller has shown the Pylance or Python Language Server Output window so that textDocuments is populated with our Log file
    let pylanceLogs = '';
    const doc = vscode.workspace.textDocuments.find((td) => td.languageId === 'Log');
    if (doc) {
        pylanceLogs = doc.getText();
    }

    const body = `
<!--
Read the guidelines for filing an issue first.

https://github.com/microsoft/pylance-release/blob/master/TROUBLESHOOTING.md#filing-an-issue
-->

<h3> Environment data </h3>

-   Language Server version: ${extensionVersion}
-   OS and version: ${platform} ${arch}
-   Python version (and distribution if applicable, e.g. Anaconda): 
-   python.analysis.indexing: ${indexing}
-   python.analysis.typeCheckingMode: ${typeCheckingMode}

<h3> Expected behaviour </h3>

XXX

<h3> Actual behaviour </h3>

XXX

<h3> Logs </h3>

<!--
Enable trace logging by adding "python.analysis.logLevel": "Trace" to your settings.json configuration file.

Adding this will cause a large amount of info to be printed to the Python output panel. This should not be left long term, as the performance impact of the logging is significant.
-->
Python Language Server Log
\`\`\`
XXX 'Please paste the output from your clipboard'
\`\`\`

<h3> Code Snippet / Additional information </h3>

<!--
Note: If you think a GIF of what is happening would be helpful, consider tools like https://www.cockos.com/licecap/, https://github.com/phw/peek or https://www.screentogif.com/ .
-->

\`\`\`python
XXX
\`\`\`
`;
    // Add logs to clipboard because they could be too large for url
    vscode.env.clipboard.writeText(pylanceLogs);

    const encodedBody = querystring.stringify({ body });
    const fullUrl = `${issuesUrl}?${encodedBody}`;
    browser.launch(fullUrl);
}
