---
author: 陈广亮
pubDatetime: 2016-02-01T10:00:00+08:00
title: "String.concat 与 apply 的妙用"
slug: string-concat-apply
featured: false
draft: false
tags:
  - JavaScript
description: "使用 apply 将数组中的字符串一次性拼接。"
---

将字符串 `"a"` 连接数组 `["b", "c"]` 里的所有字符串：

```js
// 文艺解法
String.prototype.concat.apply("a", ["b", "c"]); // "abc"

// 普通解法
["a", "b", "c"].join(""); // "abc"
```
