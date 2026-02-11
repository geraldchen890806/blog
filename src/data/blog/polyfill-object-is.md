---
author: 陈广亮
pubDatetime: 2019-08-15T10:00:00+08:00
title: "Polyfill 学习：Object.is"
slug: polyfill-object-is
featured: false
draft: false
tags:
  - JavaScript
  - polyfill
description: "Object.is 解决了 0 === -0 和 NaN !== NaN 的问题。"
---

`===` 的两个坑：

```js
0 === -0; // true
NaN === NaN; // false
```

Polyfill：

```js
if (!Object.is) {
  Object.is = function (v1, v2) {
    // 检查 -0
    if (v1 === 0 && v2 === 0) {
      return 1 / v1 === 1 / v2;
    }
    // 检查 NaN
    if (v1 !== v1) {
      return v2 !== v2;
    }
    return v1 === v2;
  };
}
```
