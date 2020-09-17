# Pylance

## To Build

-   `npm install` to install all dependencies, recursively.
-   In the `packages/vscode-pylance` folder, run `npm run package` to build a VSIX.

## Releasing the extension

Release builds are produced automatically by the build pipeline. To release,
a tag must be pushed to the pyrx repo, then the build fetched from the pipeline
artficats and uploaded the the extension website.

To do this, you can either clone the main repo and push the tag, or push the tag
from a fork with the upstream set. For example

```sh
# If using HTTP auth
git clone https://www.github.com/microsoft/pyrx pyrx-origin
# If using SSH auth
git clone git@github.com:microsoft/pyrx.git pyrx-origin
```

Then tag and push:

```
git tag 2020.6.1
git push --tags
```

When the build completes for the tag, grab the VSIX from its artifacts, verify its contents,
then upload to [extension management site](https://marketplace.visualstudio.com/manage/publishers/ms-python/).

## Manual release steps

If a release needs to be done manually, it can be done manually by cleaning.

```sh
git clean -fdx
npm install
npx gulp setVersion --to 2020.6.1
cd packages/vscode-pylance
npm run package
```

## Running

### Using Pylance test extension

-   Ensure you've run `npm install`.
-   If you have Python extension installed, uninstall it or change `python.languageServer` to `None`.
-   Run either the "Pylance debug client" or the "Pylance debug client (watch mode)" launch task.
    This will start the debug extension in another VS Code instance.
-   To attach to the server, return to the first instance and switch the menu in the debugger panel to
    "Pylance debug client attach server" and hit the play button to attach to the server process.
    At this point, you should be able to set breakpoints anywhere in the server code.

### Debugging IntelliCode in Pylance test extension

-   Open VS Code extensions folder
-   Locate IntelliCode model, typically largest file in `extensions\visualstudioexptteam.vscodeintellicode-*\cache`.
-   Open `src/intelliCode/extension.ts`
-   Add `this._modelZipPath = '<path_to_the_model>;'`
-   You should be able to debug IntelliCode model and recommendations.

### In VS Code Python extension

-   Clone [Python Extension](https://github.com/microsoft/vscode-python) and follow its contributing steps.
-   Create `nodeLanguageServer` subfolder in the `vscode-python` folder.
-   Build a version of Pylance compatible with the code extension by running "npm run webpack" in the `packages/vscode-pylance` folder.
-   Copy contents of `dist` folder to `nodeLanguageServer` subfolder in the Python extension.
-   Set these attributes in `settings.json`:

```json
"python.languageServer": "Pylance"
"python.downloadLanguageServer": false,
"python.blobName": "d67e4491-7116-42e0-8d18-5394f74187ce",
"python.analysis.downloadChannel": "daily",
"python.packageName": "Python-Language-Server"
```

-   Launch the extension and open a Python file. The extension should then start Pylance language server.

## Debugging server startup code

Add `--inspect-brk` to `debugOptions` in `activate(context: ExtensionContext)`, such as

```ts
const debugOptions = { execArgv: ['--nolazy', '--inspect=6600', '--inspect-brk'] };
```

## Debugging Pylance extension startup code

Pylance extension does not launch language server on its own. However, you may need to debug code that determines extension version or verifies host handshake. Use `LS Extension startup` launch task. You may need to delete `dist` folder content since task packages the extension for debugging rather than for the release.

## Tests

-   [Jest](https://jestjs.io/) is the test runner.
-   Use [ts-mockito](https://www.npmjs.com/package/ts-mockito) for mocking.
-   To run or debug tests in current file use `Pylance jest current file` task.
-   Useful extensions: `Jest` (from Orta)

## Debugging IntelliCode CLI

IntelliCode CLI is an utility that processes one or multiple repos and generates training data. Code is in `pythia/pythia.ts` with its own build and packaging. There is a task `IntelliCode Debug CLI` in `launch.json` that can be used for debugging. Adjust CLI arguments as needed in the `launch.json`.

## Code style

-   Formatting: install [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
    -   Formatting is enforced by a workspace `settings.json` (which will enable format-on-save) and committed Prettier config files. `Prettier` has been pinned to a specific in package.json to preserve consistency, as its style is not guaranteed to match between patch releases.
    -   The following file types will be automatically formatted: `*.ts`, `*.js`, `*.md`
-   Linting: install [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
    -   TSLint is deprecated; do not use it.

### Interface naming

-   When definining interface use plain name. Do not prefix with 'I' or use 'Interface' suffix. Instead, name class that implements the interface with 'Implemetation' or 'Impl' suffix. Example:

```ts
export interface TelememetryService {}
export class TelememetryServiceImpl implements TelememetryService {}
```

## Pyright subrepo

Pyright is included as a [git subrepo](https://github.com/ingydotnet/git-subrepo).

Subrepos are implemented via `git worktree`, which allows custom git trees to exist as regular branches,
and a `.gitrepo` file which stores the subrepo's metadata (no magic strings in commits to preserve).

Use the `.\subrepo.ps1` script to manage the subrepo. Example commands include:

```ps1
# Pull from upstream pyright into packages/pyright
.\subrepo.ps1 pull
# Create a squashed commit on a temporary branch to push back to pyright
.\subrepo.ps1 branch -m "commit message"
# Push the squashed comment created by "subrepo branch" to your fork ("pyright-fork" remote, see below)
.\subrepo.ps1 push-to-fork -forkBranch some-branch-name
# Push the squashed comment created by "subrepo branch" to a specific remote.
.\subrepo.ps1 push-to-fork -forkRemote my-custom-remote -forkBranch some-branch-name
```

The script contain comments which explain each of the steps. If the `git subrepo` fails, it will
typically print a list of steps to follow by hand in order to complete the change (e.g. fixing
a merge conflict on pull).

In order to push to pyright, you'll need to add your fork as a remote, by doing one of:

```sh
# If using git via SSH auth.
git remote add pyright-fork git@github.com:<USERNAME>/pyright.git
# If using git via HTTPS username/password auth.
git remote add pyright-fork https://github.com/<USERNAME>/pyright.git
```

_NOTE:_ **DO NOT** use `git subrepo push`; this subcommand will push changes directly to `pyright`
if you have push access (as this method is intended to distribute a large repo as many small ones).
Instead, follow the steps below to manually split out changes to a branch and push them to a pyright fork.

### Installing git-subrepo

`git-subrepo` is not included with the main git installation. To install on Windows:

1. Clone `git-subrepo` somewhere. For the rest of these instructions, assume a clone in `E:\git-subrepo`
1. Check out the latest release tag -- `git checkout 0.4.1`
1. Set the environment variable `GIT_SUBREPO_ROOT` to `E:\git-subrepo`
1. Prepend the `PATH` environment variable with `E:\git-subrepo;E:\git-subrepo\lib`
1. Close and reopen all terminals to ensure the variables are picked up.

On other OSs, follow `git-subrepo`'s README.
