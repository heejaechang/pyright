## PyRx: PyRight Language Service Extension

### Initial population
PyRight is include as a submodule. After cloning repo run
`git submodule update --init --recursive`

### To Build

* `npm install` to install latest npm dependencies
* `npm run build` to build the project

### To Update PyRight Submodule

* `git submodule update --remote`

### Packaging
From the root folder of the repo run `npx webpack`.

### Running
* Clone [Python Extension](https://github.com/Microsoft/vscode-python)
* Create pyrx subfolder
* Copy contents of `dist` folder to `pyrx` subfolder in the Python extension.
* Set `"python.languageServer": "PyRx",`
* Launch the extension and open a Python file. The extension should then start PyRx language server.


