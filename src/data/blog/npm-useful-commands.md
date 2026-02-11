---
author: 陈广亮
pubDatetime: 2018-08-01T10:00:00+08:00
title: "npm 高效但非常用命令整理"
slug: npm-useful-commands
featured: false
draft: false
tags:
  - Node.js
  - 前端工程化
description: "npm list、npm outdated、npm prune、npm-check 等实用命令。"
---

- `npm list --depth 0` — 只显示第一层依赖
- `npm list --global` — 列出全局安装的模块
- `npm search node` — 搜索 npm 仓库
- `npm outdated` — 检查依赖是否有新版本
- `npm prune` — 检查 node_modules 中未在 package.json 中声明的模块
- `npm-check` — 第三方工具，检查依赖更新、缺失、错误及未使用情况

```bash
npm install npm-check -g
npm-check
```
