---
author: Gerald Chen
pubDatetime: 2019-08-15T10:00:00+08:00
title: "Learning Polyfills: Object.is"
slug: polyfill-object-is
featured: false
draft: true
tags:
  - JavaScript
  - polyfill
description: "Object.is fixes the 0 === -0 and NaN !== NaN quirks."
---

Two gotchas with `===`:

```js
0 === -0; // true
NaN === NaN; // false
```

The polyfill:

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
