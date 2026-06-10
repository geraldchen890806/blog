---
author: Gerald Chen
pubDatetime: 2015-06-01T10:00:00+08:00
title: "Fixing Lost Line Breaks When Copying Text to a TXT File"
slug: txt-newline
featured: false
draft: true
tags:
  - JavaScript
description: "How to fix line breaks getting lost when copying text into a txt file."
---

When you copy text into a txt file, the line breaks can get lost. Here's the programmer's fix:

```js
text.replace(/\n/g, "\r\n");
```
