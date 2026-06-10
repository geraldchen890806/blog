---
author: Gerald Chen
pubDatetime: 2018-08-15T10:00:00+08:00
title: "How to Run ESLint Checks on git commit"
slug: git-hooks-eslint
featured: false
draft: true
tags:
  - Git
  - 前端工程化
description: "Automatically run ESLint at commit time with pre-commit and lint-staged."
---

## The Setup: pre-commit + lint-staged

```bash
npm install pre-commit lint-staged --save-dev
```

package.json configuration:

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

Using `--ignore-path .gitignore` is recommended; reach for `.eslintignore` if you have special requirements.
