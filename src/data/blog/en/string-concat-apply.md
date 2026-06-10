---
author: Gerald Chen
pubDatetime: 2016-02-01T10:00:00+08:00
title: "A Neat Trick with String.concat and apply"
slug: string-concat-apply
featured: false
draft: true
tags:
  - JavaScript
description: "Concatenate all strings in an array in one shot with apply."
---

To concatenate the string `"a"` with every string in the array `["b", "c"]`:

```js
// 文艺解法
String.prototype.concat.apply("a", ["b", "c"]); // "abc"

// 普通解法
["a", "b", "c"].join(""); // "abc"
```
