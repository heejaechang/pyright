## PyRx: PyRight Language Service Extension

### Initial population
PyRight is include as a subtree. After cloning PyRx
* Add Pyright as remote: `git remote add -f pyright https://github.com/microsoft/pyright.git`
* Add Pyright subtree to the server `git subtree add --prefix server/pyright pyright master`

[Subtree tutorial](https://www.atlassian.com/git/tutorials/git-subtree)

### To update Pyright
* `git fetch pyright master`
* `git subtree pull --prefix server/pyright pyright master`

### To contribute to Pyright from PyRx
* Fork Pyright.
* `git remote add MyPyrightFork https://github.com/MyName/pyright.git`
* Make changes to Pyright locally.
* `git subtree push --prefix=server/pyright MyPyrightFork BRANCH`
* `git push using: MyPyrightFork BRANCH`
* Open PR in Pyright repo from your fork to Pyright master.

### To Build
* `npm run install:all` to install latest npm dependencies
* `npm run build` to build the project

### Packaging
From the `server` folder of the repo run `npx webpack`.

### Running
Locally:
* If you have Python extension installed, change `python.languageServer` to `None`.
* Do a production build from the command-line (`npm run package`). This will ensure that all of the npm dependencies are downloaded and the project builds.
* Within VS Code, open the pyright project. 
* In the debugger panel make sure "Pyright Language Client" is selected. 
* Press F5 to start. This will launch a second instance of VS Code. 
* Go back to the first instance and switch the menu in the debugger panel to "Pyright Language Server" and hit the play button to attach to the server process. At this point, you should be able to set breakpoints anywhere in the server code, including the language service modules.

In VS Code Python extension
* Clone [Python Extension](https://github.com/Microsoft/vscode-python)
* Create `nodeLanguageServer` subfolder
* Copy contents of `dist` folder to `nodeLanguageServer` subfolder in the Python extension.
* Set `"python.languageServer": "Node",`
* Launch the extension and open a Python file. The extension should then start PyRx language server.


