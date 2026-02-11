---
author: 陈广亮
pubDatetime: 2015-10-01T10:00:00+08:00
title: "正则表达式：元字符 \\b 与注意事项"
slug: regex-basics
featured: false
draft: false
tags:
  - JavaScript
  - 正则表达式
description: "正则表达式元字符 \\b 的使用注意事项。"
---

元字符 `\b` 匹配单词的开始或结束。

```js
/^\b\S*$/.test("test"); // true
/^\b\S*$/.test("test test"); // false
```

注意 `\b` 的匹配项是 `[0-9A-Z_a-z]`（数字、大小写字母及下划线），所以要注意单词前后的特殊字符：

```js
/\btest\b/.test("@test"); // true
/\btest\b/.test("test"); // true
```
