---
author: 陈广亮
pubDatetime: 2016-06-15T10:00:00+08:00
title: "Underscore pluck 方法"
slug: underscore-pluck
featured: false
draft: false
tags:
  - JavaScript
description: "Underscore.js 的 pluck 方法快速提取对象数组中的某个属性。"
---

```js
var stooges = [
  { name: "moe", age: 40 },
  { name: "larry", age: 50 },
  { name: "curly", age: 60 },
];

_.pluck(stooges, "age"); // [40, 50, 60]
_.max(_.pluck(stooges, "age")); // 60
_.max(stooges, "age"); // {name: 'curly', age: 60}
```
