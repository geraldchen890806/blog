---
author: 陈广亮
pubDatetime: 2015-05-20T10:00:00+08:00
title: "window.showModalDialog 与 window.open 跨域方案"
slug: window-open-cross-origin
featured: false
draft: false
tags:
  - JavaScript
  - 兼容性
description: "Chrome 不支持 showModalDialog，使用 postMessage 解决跨域通信。"
---

Chrome 不支持 `showModalDialog`，使用 `window.open` 代替。跨域场景下用 `postMessage`：

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

Firefox、Safari、Opera、IE9+ 均支持 `postMessage`。
