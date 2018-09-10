## npm 高效但非常用命令整理

### npm list

- npm list 以树型结构列出当前项目安装的所有模块，以及它们依赖的模块。
- npm list --depth 0 只显示第一层
- npm list --global 列出全局安装的模块

### npm search

- npm search node 用于搜索 npm 仓库中的 node 版本

### npm outdated

- npm outdated 检查当前项目所依赖的模块，是否已经有新版本

### npm prune

- npm prune 检查当前项目的 node_modules 目录中，是否有 package.json 里面没有提到的模块，然后将所有这些模块输出在命令行。

### npm-check

- npm-check 一个 npm 包更新工具。它还可以检查项目的 npm 依赖包是否有更新，缺失，错误以及未使用等情况。

```
  npm install npm-check -g
  npm-check
```
