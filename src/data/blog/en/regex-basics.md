---
author: Gerald Chen
pubDatetime: 2015-10-01T10:00:00+08:00
title: "Regular Expressions: The \\b Metacharacter and Its Gotchas"
slug: regex-basics
featured: false
draft: true
tags:
  - JavaScript
  - 正则表达式
description: "Things to watch out for when using the regex metacharacter \\b."
---

The metacharacter `\b` matches the beginning or end of a word.

```js
/^\b\S*$/.test("test"); // true
/^\b\S*$/.test("test test"); // false
```

Keep in mind that `\b` defines word characters as `[0-9A-Z_a-z]` (digits, letters, and underscore), so watch out for special characters around a word:

```js
/\btest\b/.test("@test"); // true
/\btest\b/.test("test"); // true
```
