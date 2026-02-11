---
author: 陈广亮
pubDatetime: 2015-11-15T10:00:00+08:00
title: "一个有趣的 for 循环用法"
slug: js-for-loop-trick
featured: false
draft: false
tags:
  - JavaScript
description: "Object.keys polyfill 中的 for 循环妙用。"
---

`Object.keys` 用来获取对象所有可枚举属性，兼容 IE8-：

```js
Object.keys =
  Object.keys ||
  function (obj) {
    var a = [];
    for (a[a.length] in obj);
    return a;
  };
```

`for (a[a.length] in obj)` — 每次迭代时，将属性名赋给 `a[a.length]`，自动追加到数组末尾。

另外，`Object.getOwnPropertyNames(obj)` 可获取所有实例属性（无论是否可枚举）：

```js
Array.test = function () {};
Object.keys(Array); // ["test"]
Object.getOwnPropertyNames(Array); // ["length", "name", ..., "test"]
```
