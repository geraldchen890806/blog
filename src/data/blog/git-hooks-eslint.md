---
author: 陈广亮
pubDatetime: 2018-08-15T10:00:00+08:00
title: "如何在 git commit 时添加 ESLint 校验"
slug: git-hooks-eslint
featured: false
draft: false
tags:
  - Git
  - 前端工程化
description: "使用 pre-commit 和 lint-staged 在提交时自动运行 ESLint。"
---

## 方案：pre-commit + lint-staged

```bash
npm install pre-commit lint-staged --save-dev
```

package.json 配置：

```json
{
  "scripts": {
    "lint:staged": "lint-staged"
  },
  "lint-staged": {
    "linters": {
      "*.js": ["eslint --ignore-path .gitignore --fix"]
    }
  },
  "pre-commit": "lint:staged"
}
```

`--ignore-path .gitignore` 建议使用，特殊需求可以用 `.eslintignore`。
