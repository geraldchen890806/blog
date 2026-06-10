---
author: Gerald Chen
pubDatetime: 2016-06-15T10:00:00+08:00
title: "Underscore's pluck Method"
slug: underscore-pluck
featured: false
draft: true
tags:
  - JavaScript
description: "Use Underscore.js's pluck method to quickly extract a property from an array of objects."
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
