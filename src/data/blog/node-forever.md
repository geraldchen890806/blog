---
author: 陈广亮
pubDatetime: 2015-04-01T10:00:00+08:00
title: "Node forever 进程管理"
slug: node-forever
featured: false
draft: false
tags:
  - Node.js
description: "使用 forever 管理 Node.js 进程，包括 koa 的和谐模式启动。"
---

forever 是 Node 用来启动、停止服务的一个小工具。

## 安装

```bash
npm install forever -g
```

## 启动

```bash
forever app.js
```

## Koa 启动（需要 harmony 模式）

```bash
forever start -c "node --harmony" app.js
```

## Tips

如果遇到 `Error: listen EADDRINUSE`，说明端口已被占用：

```bash
forever list
forever stop app.js
```
