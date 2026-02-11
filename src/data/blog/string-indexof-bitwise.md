---
author: 陈广亮
pubDatetime: 2016-01-20T10:00:00+08:00
title: "用按位非 ~ 简化 indexOf 判断"
slug: string-indexof-bitwise
featured: false
draft: false
tags:
  - JavaScript
description: "利用按位非操作符简化 indexOf 的判断写法。"
---

`~` 按位非操作符：对任一数值 x 进行按位非的结果为 `-(x + 1)`。

所以 `~(-1) === 0`，刚好是 falsy 值！

```js
// 常用写法
if ("abc".indexOf("b") > -1) {
}

// 简化写法
if (~"abc".indexOf("b")) {
}
```
