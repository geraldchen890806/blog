---
author: 陈广亮
pubDatetime: 2018-06-20T10:00:00+08:00
title: PWA 入门与实践
slug: pwa-intro
featured: false
draft: false
tags:
  - PWA
  - 前端
  - 性能优化
description: Progressive Web App 核心技术介绍与实践踩坑记录。
---

## 什么是 PWA

Progressive Web App（渐进式 Web 应用）是提升 Web App 体验的一种方法，能给用户接近原生应用的体验。

### 三大特点

1. **可靠** — 即使在不稳定的网络环境下，也能瞬间加载并展现（Service Worker）
2. **体验** — 快速响应，平滑的动画（App Shell 模式）
3. **粘性** — 可以添加到桌面，支持离线通知（Web App Manifest）

### Service Worker 快速实现

推荐使用 [offline-plugin](https://github.com/NekR/offline-plugin)：

```js
// webpack.config.js
var OfflinePlugin = require("offline-plugin");
module.exports = {
  plugins: [new OfflinePlugin({ Caches: "all" })],
};

// index.js
import * as OfflinePluginRuntime from "offline-plugin/runtime";
OfflinePluginRuntime.install();
```

### 踩坑记录

1. iOS 桌面 icon 实现依然使用 `<link>` 标签，不支持 manifest
2. 全站必须使用 HTTPS
3. `manifest.json` 配置的 `start_url` 必须在 Service Worker 缓存列表中，否则无法离线使用

### 推荐阅读

- [下一代 Web 应用模型 — Progressive Web App](https://huangxuan.me/2017/02/09/nextgen-web-pwa/)
- [饿了么的 PWA 升级实践](https://huangxuan.me/2017/07/12/upgrading-eleme-to-pwa/)
