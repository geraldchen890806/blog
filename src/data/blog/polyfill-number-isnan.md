---
author: 陈广亮
pubDatetime: 2018-07-01T10:00:00+08:00
title: "Polyfill 学习：Number.isNaN"
slug: polyfill-number-isnan
featured: false
draft: false
tags:
  - JavaScript
  - polyfill
description: "利用 NaN 不等于自身的特性实现 Number.isNaN。"
---

NaN 是唯一一个不等于自身的值：

```js
if (!Number.isNaN) {
  Number.isNaN = function (n) {
    return n !== n;
  };
}
```

注意 `window.isNaN('a')` 返回 `true`，而 `Number.isNaN('a')` 返回 `false`。
