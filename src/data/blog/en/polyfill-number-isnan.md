---
author: Gerald Chen
pubDatetime: 2018-07-01T10:00:00+08:00
title: "Learning Polyfills: Number.isNaN"
slug: polyfill-number-isnan
featured: false
draft: true
tags:
  - JavaScript
  - polyfill
description: "Implementing Number.isNaN by exploiting the fact that NaN is never equal to itself."
---

NaN is the only value that is not equal to itself:

```js
if (!Number.isNaN) {
  Number.isNaN = function (n) {
    return n !== n;
  };
}
```

Note that `window.isNaN('a')` returns `true`, while `Number.isNaN('a')` returns `false`.
