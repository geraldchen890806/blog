---
author: 陈广亮
pubDatetime: 2016-04-15T10:00:00+08:00
title: "实现链式函数 add"
slug: js-chain-add
featured: false
draft: false
tags:
  - JavaScript
description: "利用 valueOf 实现 add(1)(2)(3) == 6 的链式调用。"
---

要求：

```js
add(1) == 1;
add(1)(2) == 3;
add(1)(2)(3) == 6;
```

`add(1)` 必须返回函数才能链式调用，而函数做比较时会调用 `valueOf()`：

```js
function add(n) {
  var fn = function (x) {
    return add(n + x);
  };
  fn.valueOf = function () {
    return n;
  };
  return fn;
}
```
