---
author: Gerald Chen
pubDatetime: 2018-06-20T10:00:00+08:00
title: Getting Started with PWA
slug: pwa-intro
featured: false
draft: true
tags:
  - PWA
  - 前端
  - 性能优化
description: An introduction to the core technologies behind Progressive Web Apps, plus pitfalls I ran into in practice.
---

## What Is a PWA

A Progressive Web App is an approach to improving the web app experience, giving users something close to a native app.

### Three Key Traits

1. **Reliable** — loads instantly even on flaky networks (Service Worker)
2. **Fast** — responsive UI with smooth animations (App Shell pattern)
3. **Engaging** — can be added to the home screen and supports offline notifications (Web App Manifest)

### Setting Up a Service Worker Quickly

I recommend [offline-plugin](https://github.com/NekR/offline-plugin):

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

### Pitfalls

1. On iOS, the home screen icon still has to be set via a `<link>` tag — the manifest is not supported
2. The entire site must be served over HTTPS
3. The `start_url` configured in `manifest.json` must be included in the Service Worker cache list, otherwise the app won't work offline

### Further Reading

- [The Next-Generation Web App Model — Progressive Web App](https://huangxuan.me/2017/02/09/nextgen-web-pwa/)
- [Upgrading Ele.me to a PWA](https://huangxuan.me/2017/07/12/upgrading-eleme-to-pwa/)
