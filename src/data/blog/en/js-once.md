---
author: Gerald Chen
pubDatetime: 2015-05-10T10:00:00+08:00
title: "Implementing a once Function"
slug: js-once
featured: false
draft: true
tags:
  - JavaScript
description: "Using a closure to build a function that can only be called once."
---

Let's write a function that wraps another function so it can only be invoked once — a simple application of closures.

```js
logOnce = once(console.log);
logOnce("foo"); // -> "foo"
logOnce("bar"); // -> no effect
```

The implementation:

```js
function once(fn) {
  var flag = true;
  return function () {
    if (flag) {
      flag = false;
      return fn.apply(this, arguments);
    }
    return;
  };
}
```
