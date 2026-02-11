---
author: 陈广亮
pubDatetime: 2016-06-01T10:00:00+08:00
title: "Array forEach 在 IE 低版本的兼容"
slug: array-foreach-polyfill
featured: false
draft: false
tags:
  - JavaScript
  - 兼容性
description: "forEach polyfill 实现与 jQuery each 方法对比。"
---

IE8 及以前没有 `forEach`，核心 polyfill：

```js
if (!Array.prototype.forEach) {
  Array.prototype.forEach = function (callback, thisArg) {
    var O = Object(this);
    var len = O.length >>> 0;
    var k = 0;
    while (k < len) {
      if (k in O) {
        callback.call(thisArg, O[k], k, O);
      }
      k++;
    }
  };
}
```

**注意**：jQuery 的 `each` 方法回调参数顺序与 `forEach` 相反——先 `index` 后 `elem`。
