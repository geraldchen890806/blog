---
author: 陈广亮
pubDatetime: 2016-05-15T10:00:00+08:00
title: "function arguments 参数同步机制"
slug: js-arguments
featured: false
draft: false
tags:
  - JavaScript
description: "arguments 与输入参数的同步关系。"
---

```js
!(function (a, b) {
  arguments[0] = 11;
  alert(a); // 11
})(1, 2);

!(function (a, b) {
  arguments[1] = 11;
  alert(b); // undefined
})(1);
```

结论：`arguments` 在函数调用时与输入参数做匹配，值同步。但 `arguments` 扩展不会影响原本没有匹配的参数。
