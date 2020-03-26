# PyRx: PyRight Language Service Extension

## To Build

-   `npm run package` to run complete build and install of latest npm dependencies

## Packaging

From the `server` folder of the repo run `npx webpack`.

## Running

### Using PyRx test extension

-   If you have Python extension installed, change `python.languageServer` to `None`.
-   Do a production build from the command-line (`npm run package`). This will ensure that all of the npm dependencies are downloaded and the project builds.
-   Within VS Code, open the PyRx folder.
-   In the debugger panel make sure `PyRx Debug Client` is selected.
-   Press F5 to start. This will launch a second instance of VS Code.
-   Go back to the first instance and switch the menu in the debugger panel to `PyRx Attach Server` and hit the play button to attach to the server process. At this point, you should be able to set breakpoints anywhere in the server code, including the language service modules.

### In VS Code Python extension

-   Clone [Python Extension](https://github.com/Microsoft/vscode-python)
-   Create `nodeLanguageServer` subfolder
-   Copy contents of `dist` folder to `nodeLanguageServer` subfolder in the Python extension.
-   Set `"python.languageServer": "Node"`
-   Launch the extension and open a Python file. The extension should then start PyRx language server.

## Debugging in VS Code Python extension

-   Modify `tsconfig.json` in `server` folder by adding `sourceRoot` pointing where PyRx Server soources are. For example:`"sourceRoot": "e:/pyrx/server",`. This will generate source maps with absolute paths.
-   Build PyRx by running `npm run package` .
-   Copy `client\server` folder to `nodeLanguageServer` subfolder in the Python extension.
-   Run Python extension (in debugger or otherwise).
-   When PyRx loads, switch to VS Code instance with PyRx.
-   `Debug` => `PyRx Attach Server`
-   You should be able to set breakpoints in PyRx or PyRight and hit them.

## Debugging server startup code

Add `--inspect-brk` to `debugOptions` in `activate(context: ExtensionContext)`, such as

```ts
const debugOptions = { execArgv: ['--nolazy', '--inspect=6600', '--inspect-brk'] };
```

## Tests

-   [Jest](https://jestjs.io/) is the test runner.
-   Use [ts-mockito](https://www.npmjs.com/package/ts-mockito) for mocking.
-   To run or debug tests in current file use `PyRx jest current file` task.
-   To run all tests from command line use `npm run test:all`.
-   Useful extensions: `Jest` (from Orta)

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

For convenience, the `.\subrepo.ps1` script handles most of the below via commands like:

```ps1
.\subrepo.ps1 pull
.\subrepo.ps1 branch -m "commit message"
.\subrepo.ps1 push-to-fork -forkBranch some-branch-name
.\subrepo.ps1 push-to-fork -forkRemote my-custom-remote -forkBranch some-branch-name
```

### Installing git-subrepo

`git-subrepo` is not included with the main git installation. To install on Windows:

1. Clone `git-subrepo` somewhere. For the rest of these instructions, assume a clone in `E:\git-subrepo`
1. Check out the latest release tag -- `git checkout 0.4.1`
1. Set the environment variable `GIT_SUBREPO_ROOT` to `E:\git-subrepo`
1. Prepend the `PATH` environment variable with `E:\git-subrepo;E:\git-subrepo\lib`
1. Close and reopen all terminals to ensure the variables are picked up.

On other OSs, follow `git-subrepo`'s README.

### Creating the subrepo

The subrepo was created with the following command:

```sh
git subrepo clone https://github.com/microsoft/pyright.git server/pyright
```

This command may also be used to reclone the repo if needed via the `--force` flag.

### Pulling from pyright into pyrx

In a new up-to-date branch on your fork, do:

```sh
# Remove the temporary branch and worktree.
git subrepo clean server/pyright
# Pull changes and squash commit them.
git subrepo pull server/pyright
```

_*Note*_: The above is equivalent to running `.\subrepo.ps1 pull`.

This will pull `pyright` and squash its changes as a single commit into the branch with the `.gitrepo`
file updated to reflect the fetched commit. Now, open a PR back to pyrx as a regular change. Since
the metadata is stored as a file, it should be safe to commit in whichever way is most convenient.

### Pushing from pyrx to pyright

_NOTE:_ **DO NOT** use `git subrepo push`; this subcommand will push changes directly to `pyright`
if you have push access (as this method is intended to distribute a large repo as many small ones).
Instead, follow the steps below to manually split out changes to a branch and push them to a pyright fork.

First, ensure your pyright is a remote (only needed once):

```sh
git remote add pyright-fork git@github.com:<USERNAME>/pyright.git
```

Now, prepare the squash to push back to pyright (assuming `sh` or PowerShell for `pushd`/`popd`, but you may just use `cd`).
The following steps are confined to a temporary branch and worktree; potential errors will not harm the main repo.

```sh
# Populate the subrepo/server/pyright branch with new changes. -f overwrites the branch.
git subrepo branch server/pyright -f
# Enter worktree; changes here are applied to the subrepo/server/pyright branch.
pushd .git/tmp/subrepo/server/pyright
# Remove all commits after the last pull and restage the difference.
git reset --soft refs/subrepo/server/pyright/fetch
# Optional: preview the changes.
git status
git diff --staged
# Commit changes with a new message.
git commit -m "Adding X, Y, and Z"
# Return to pyrx.
popd
```

_*Note*_: The above is equivalent to running `.\subrepo.ps1 branch -m "Adding X, Y, and Z"`.

Finally, push the changes to a branch in your pyright fork to PR
(feel free to `--force` if needed; this only changes the fork):

```sh
git push pyright-fork subrepo/server/pyright:<BRANCH>
```

_*Note*_: The above is equivalent to running `.\subrepo.ps1 push-to-fork -forkBranch <BRANCH>`.
