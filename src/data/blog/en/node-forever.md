---
author: Gerald Chen
pubDatetime: 2015-04-01T10:00:00+08:00
title: "Managing Node Processes with forever"
slug: node-forever
featured: false
draft: true
tags:
  - Node.js
description: "Using forever to manage Node.js processes, including launching koa apps in harmony mode."
---

forever is a small tool for starting and stopping Node services.

## Installation

```bash
npm install forever -g
```

## Starting an app

```bash
forever app.js
```

## Starting Koa (requires harmony mode)

```bash
forever start -c "node --harmony" app.js
```

## Tips

If you run into `Error: listen EADDRINUSE`, the port is already in use:

```bash
forever list
forever stop app.js
```
