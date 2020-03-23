## PyRx: PyRight Language Service Extension

### Initial population

PyRight is included as a subtree. After cloning PyRx

-   Add PyRight as remote: `git remote add -f pyright https://github.com/microsoft/pyright.git`
-   Add PyRight subtree to the server `git subtree add --prefix server/pyright pyright master`

[Subtree tutorial](https://www.atlassian.com/git/tutorials/git-subtree)

### To update PyRight

-   `git fetch pyright master`
-   `git subtree pull --prefix server/pyright pyright master --squash`

### To contribute to PyRight from PyRx

-   Fork PyRight.
-   `git remote add MyPyrightFork https://github.com/MyName/pyright.git`
-   Make changes to PyRight locally.
-   `git subtree push --squash --prefix=server/pyright MyPyrightFork BRANCH`
-   Open PR in PyRight repo from your fork to PyRight master.

### To Build

-   `npm run package` to run complete build and install of latest npm dependencies

### Packaging

From the `server` folder of the repo run `npx webpack`.

### Running

**Using PyRx test extension**

-   If you have Python extension installed, change `python.languageServer` to `None`.
-   Do a production build from the command-line (`npm run package`). This will ensure that all of the npm dependencies are downloaded and the project builds.
-   Within VS Code, open the PyRx folder.
-   In the debugger panel make sure `PyRx Debug Client` is selected.
-   Press F5 to start. This will launch a second instance of VS Code.
-   Go back to the first instance and switch the menu in the debugger panel to `PyRx Attach Server` and hit the play button to attach to the server process. At this point, you should be able to set breakpoints anywhere in the server code, including the language service modules.

**In VS Code Python extension**

-   Clone [Python Extension](https://github.com/Microsoft/vscode-python)
-   Create `nodeLanguageServer` subfolder
-   Copy contents of `dist` folder to `nodeLanguageServer` subfolder in the Python extension.
-   Set `"python.languageServer": "Node",`
-   Launch the extension and open a Python file. The extension should then start PyRx language server.

### Debugging in VS Code Python extension

-   Modify `tsconfig.json` in `server` folder by adding `sourceRoot` pointing where PyRx Server soources are. For example:`"sourceRoot": "e:/pyrx/server",`. This will generate source maps with absolute paths.
-   Build PyRx by running `npm run package` .
-   Copy `client\server` folder to `nodeLanguageServer` subfolder in the Python extension.
-   Run Python extension (in debugger or otherwise).
-   When PyRx loads, switch to VS Code instance with PyRx.
-   `Debug` => `PyRx Attach Server`
-   You should be able to set breakpoints in PyRx or PyRight and hit them.

### Debugging server startup code

Add `--inspect-brk` to `debugOptions` in `activate(context: ExtensionContext)`, such as

```ts
const debugOptions = { execArgv: ['--nolazy', '--inspect=6600', '--inspect-brk'] };
```

### Tests

-   [Jest](https://jestjs.io/) is the test runner.
-   Use [ts-mockito](https://www.npmjs.com/package/ts-mockito) for mocking.
-   To run or debug tests in current file use `PyRx jest current file` task.
-   To run all tests from command line use `npx jest`.
-   Useful extensions: `Jest` (from Orta)

### Code style

Code style should generally match Python extension in order to simplify work
on both products in VS Code.

-   Formatting: install [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
    -   Formatting is enforced by a workspace `settings.json` (which will enable format-on-save) and committed Prettier config files. `Prettier` has been pinned to a specific in package.json to preserve consistency, as its style is not guaranteed to match between patch releases.
    -   The following file types will be automatically formatted: `*.ts`, `*.js`, `*.md`
-   Linting: install [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
    -   TSLint is deprecated; do not use it.

#### Interface naming

-   When definining interface use plain name. Do not prefix with 'I' or use 'Interface' suffix. Instead, name class that implements the interface with 'Implemetation' or 'Impl' suffix. Example:

```ts
export interface TelememetryService {}
export class TelememetryServiceImpl implements TelememetryService {}
```
