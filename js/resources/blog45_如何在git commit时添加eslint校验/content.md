## git Hooks

首先需要了解下 [Git 钩子](https://git-scm.com/book/zh/v2/%E8%87%AA%E5%AE%9A%E4%B9%89-Git-Git-%E9%92%A9%E5%AD%90)

和其它版本控制系统一样，Git 能在特定的重要动作发生时触发自定义脚本。 有两组这样的钩子：客户端的和服务器端的。 客户端钩子由诸如提交和合并这样的操作所调用，而服务器端钩子作用于诸如接收被推送的提交这样的联网操作。

安装一个客户端钩子
钩子都被存储在 Git 目录下的 hooks 子目录中。 也即绝大部分项目中的 .git/hooks 。

## pre-commit

pre-commit 钩子在键入提交信息前运行。 它用于检查即将提交的快照，例如，检查是否有所遗漏，确保测试运行，以及核查代码。 如果该钩子以非零值退出，Git 将放弃此次提交，不过你可以用 git commit --no-verify (-n) 来绕过这个环节。 你可以利用该钩子，来检查代码风格是否一致（运行类似 lint 的程序）、尾随空白字符是否存在（自带的钩子就是这么做的），或新方法的文档是否适当。

### 测试 pre-commit

pre-commit.sample 里有个文件名的检查

```
➜  mkdir testHook
➜  cd testHook
➜  git init
Initialized empty Git repository in /Users/guangliang.chen/testHook/.git/
➜  cp .git/hooks/pre-commit.sample .git/hooks/pre-commit
➜  vi 测试.js // 新建中文名文件
➜  git add 测试.js
➜  git commit -m "test hook"

Error: Attempt to add a non-ASCII file name.

This can cause problems if you want to work with people on other platforms.

To be portable it is advisable to rename the file.

If you know what you are doing you can disable this check using:

  git config hooks.allownonascii true
```

所以我们可以在 pre-commit 里添加 eslint 操作, 想通过修改 pre-commit 实现的参考[这篇](http://wulv.site/2017-02-17/%E4%BD%BF%E7%94%A8git%E9%92%A9%E5%AD%90%E5%81%9Aeslint%E6%A0%A1%E9%AA%8C.html)

不过./hooks/pre-commit 提交代码时不会同步提交，需要下载源码后移动到.hook 文件夹下，建议使用 pre-commit 库

## pre-commit && lint-staged

下面介绍下 [pre-commit](https://pre-commit.com/) 和 [lint-staged](https://github.com/okonet/lint-staged) (官方建议跟 husky 一起使用，不过 pre-commit 好像用的人满多)

```
  npm install pre-commit --save-dev
  npm install lint-staged --save-dev
```

package.json

```
  "scripts": {
    "lint:staged": "lint-staged"
  },
  "lint-staged": {
    "linters": {
      "*.js": [
        "eslint --ignore-path .gitignore --fix"
      ]
    },
    "ignore": []
  },
  "pre-commit": "lint:staged",
```

注：

1. git hook 有很多，commit-msg post-commit 等等
2. 项目有 eslint 配置
3. 例子中只校验 js 文件，有需求可以添加其他文件类型（给 lint-staged 点赞）
4. --ignore-path .gitignore（建议使用，特殊需求使用.eslintignore）
