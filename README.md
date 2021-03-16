# Pylance

## To Build

-   `npm install` to install all dependencies, recursively.
-   In the `packages/vscode-pylance` folder, run `npm run package` to build a VSIX.

## Releasing the extension

1. Update `CHANGELOG.md` in `package/vscode-pylance`.
1. Update the NOTICE.txt file by [downloading a plaintext NOTICE from Azure DevOps](https://mseng.visualstudio.com/DSTools/_componentGovernance/535?_a=components&typeId=103424&alerts-view-option=active).
1. Tag the repo. Do not use the GitHub releases page to create the tag. Tagging the repo can be done
   by cloning the pyrx repo, tagging the main branch with `git tag 2021.1.1`, then `git push --tags`.
1. Wait for the builds to complete and the draft releases to be created on the [releases page](https://github.com/microsoft/pyrx/releases).
1. Download the VSIX, and manually inspect it for potential stray files (extra source maps, source files, etc).
1. If the build looks good, publish both releases. This will automatically push the packages to the internal package feed and publish the VSIX to the marketplace.
1. Submit a PR to pylance-release with a copy of `CHANGELOG.md`. If the new version includes any new diagnostics, update `DIAGNOSTIC_SEVERITY_RULES.md`. If the new version includes any new settings, update `README.md`.
1. Create a [new release on the pylance-release repo](https://github.com/microsoft/pylance-release/releases/new).
   This should contain the "notable changes" section, plus a link to the section in `CHANGELOG.md`.
1. Close all "fixed in next version" issues.

## Running

### Using the main Pylance extension

-   Ensure you've run `npm install`.
-   Ensure `python.languageServer` is set to `Pylance`.
-   Run either the "Pylance extension" or "Pylance extension (watch mode)" watch tasks.
-   To attach to the server, return to the first instance and switch the menu in the debugger panel to
    "Pylance extension attach server" and hit the play button to attach to the server process.
    At this point, you should be able to set breakpoints anywhere in the server code.

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
-   To run all Pylance+Pyright tests: `npx lerna run --scope=pylance-internal --scope=pyright-internal --concurrency=1 test`
-   To run all Pylance tests: `npx lerna run --scope=pylance-internal --concurrency=1 test`
-   To run all Pyright tests: `npx lerna run --scope=pyright-internal --concurrency=1 test`
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

## Updating all dependencies

To update all dependencies in the project to their latest compatible versions, run:

```sh
npm run update:all
```

This will use npm-check-updates to bump the version, then run `npm install` in all packages.
That this process does not update the VS Code API package (as updating it
sets a minimum version for users and requires manual updates to the `"engines"` property
in `package.json`), nor does it update `onnxruntime` (which we pin to a specific build).

### Updating transitive dependencies

To update all dependencies including transitive deps, run:

```sh
npm run update:all -- --transitive
```

This works by removing the lock files and reinstalling everything. This has the potential
to cause merge issues.

### Manually checking for updates

The `update:all` script only updates dependencies to compatible versions; it does not update
anything to new major versions. To manually check for updates past what `update:all` does, you
can just run `npm-check-updates` across all packages:

```sh
npx lerna exec --stream --no-bail -- npx npm-check-updates
```

More info about `npm-check-updates` can be found on [their GitHub page](https://github.com/raineorshine/npm-check-updates).
