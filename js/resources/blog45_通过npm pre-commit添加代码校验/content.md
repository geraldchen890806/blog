## 通过 npm pre-commit 添加代码校验

首先需要了解下 [Git 钩子](https://git-scm.com/book/zh/v2/%E8%87%AA%E5%AE%9A%E4%B9%89-Git-Git-%E9%92%A9%E5%AD%90)

简单的说就是在.git/hooks 里如果有个 pre-commit 文件，git commit 的时候会运行 pre-commit

好奇的可以看下这个文件夹，现在里面有个 pre-commit.sample 文件

然后可能觉得需要自己修改 pre-commit 文件，像[这篇](http://wulv.site/2017-02-17/%E4%BD%BF%E7%94%A8git%E9%92%A9%E5%AD%90%E5%81%9Aeslint%E6%A0%A1%E9%AA%8C.html)介绍的。

作为一个单纯（蠢）的前端开发，看不懂啊

介绍下 pre-commit 和 [lint-staged](https://github.com/okonet/lint-staged) (官方建议跟 husky 一起使用，不过 pre-commit 好像用的人满多)

```
  npm install pre-commit --save-dev
  npm install lint-staged --save-dev

  //package.json

  "scripts": {
    "lint:staged": "lint-staged"
  },
  "lint-staged": {
    "linters": {
      "*.js": [
        "eslint --ignore-path .gitignore --ignore-pattern static --fix"
      ]
    },
    "ignore": []
  },
  "pre-commit": "lint:staged",
```
