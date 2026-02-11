---
author: 陈广亮
pubDatetime: 2015-06-01T10:00:00+08:00
title: "文本复制换行问题"
slug: txt-newline
featured: false
draft: false
tags:
  - JavaScript
description: "文本复制到 txt 丢失换行格式的解决方法。"
---

文本复制到 txt 时会丢失换行格式，程序员的解决方式：

```js
text.replace(/\n/g, "\r\n");
```
