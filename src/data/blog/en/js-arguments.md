---
author: Gerald Chen
pubDatetime: 2016-05-15T10:00:00+08:00
title: "How function arguments Stay in Sync with Parameters"
slug: js-arguments
featured: false
draft: true
tags:
  - JavaScript
description: "How arguments stays in sync with a function's input parameters."
---

```js
!(function (a, b) {
  arguments[0] = 11;
  alert(a); // 11
})(1, 2);

!(function (a, b) {
  arguments[1] = 11;
  alert(b); // undefined
})(1);
```

Takeaway: `arguments` is matched against the input parameters at call time, and their values stay in sync. But extending `arguments` does not affect parameters that were never matched in the first place.
