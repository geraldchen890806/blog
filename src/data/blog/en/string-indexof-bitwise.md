---
author: Gerald Chen
pubDatetime: 2016-01-20T10:00:00+08:00
title: "Simplifying indexOf Checks with Bitwise NOT ~"
slug: string-indexof-bitwise
featured: false
draft: true
tags:
  - JavaScript
description: "Using the bitwise NOT operator to write shorter indexOf checks."
---

The `~` bitwise NOT operator: applying it to any number x yields `-(x + 1)`.

So `~(-1) === 0` — which happens to be falsy!

```js
// 常用写法
if ("abc".indexOf("b") > -1) {
}

// 简化写法
if (~"abc".indexOf("b")) {
}
```
