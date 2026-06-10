---
author: Gerald Chen
pubDatetime: 2016-04-15T10:00:00+08:00
title: "Implementing a Chainable add Function"
slug: js-chain-add
featured: false
draft: true
tags:
  - JavaScript
description: "Using valueOf to make chained calls like add(1)(2)(3) == 6 work."
---

The requirement:

```js
add(1) == 1;
add(1)(2) == 3;
add(1)(2)(3) == 6;
```

`add(1)` has to return a function so the calls can chain, and when a function is compared with `==`, JavaScript calls its `valueOf()`:

```js
function add(n) {
  var fn = function (x) {
    return add(n + x);
  };
  fn.valueOf = function () {
    return n;
  };
  return fn;
}
```
