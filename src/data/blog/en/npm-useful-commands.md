---
author: Gerald Chen
pubDatetime: 2018-08-01T10:00:00+08:00
title: "Handy npm Commands You Don't Use Every Day"
slug: npm-useful-commands
featured: false
draft: true
tags:
  - Node.js
  - 前端工程化
description: "Useful commands like npm list, npm outdated, npm prune, and npm-check."
---

- `npm list --depth 0` — show only top-level dependencies
- `npm list --global` — list globally installed packages
- `npm search node` — search the npm registry
- `npm outdated` — check whether dependencies have newer versions
- `npm prune` — find packages in node_modules that aren't declared in package.json
- `npm-check` — a third-party tool that checks for outdated, missing, incorrect, and unused dependencies

```bash
npm install npm-check -g
npm-check
```
