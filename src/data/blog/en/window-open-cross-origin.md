---
author: Gerald Chen
pubDatetime: 2015-05-20T10:00:00+08:00
title: "Replacing window.showModalDialog with window.open Across Origins"
slug: window-open-cross-origin
featured: false
draft: true
tags:
  - JavaScript
  - 兼容性
description: "Chrome doesn't support showModalDialog; use postMessage for cross-origin communication."
---

Chrome doesn't support `showModalDialog`, so use `window.open` instead. For cross-origin scenarios, communicate via `postMessage`:

```js
// 父页面
window.addEventListener("message", function (e) {
  if (e.data == "closed") {
    // 处理返回值
  }
});

// 子页面
window.opener.postMessage("closed", "*");
window.close();
```

`postMessage` is supported in Firefox, Safari, Opera, and IE9+.
