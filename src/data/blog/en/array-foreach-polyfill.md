---
author: Gerald Chen
pubDatetime: 2016-06-01T10:00:00+08:00
title: "Array forEach Compatibility in Older Versions of IE"
slug: array-foreach-polyfill
featured: false
draft: true
tags:
  - JavaScript
  - 兼容性
description: "A forEach polyfill implementation, compared with jQuery's each method."
---

IE8 and earlier don't have `forEach`. Here's the core polyfill:

```js
if (!Array.prototype.forEach) {
  Array.prototype.forEach = function (callback, thisArg) {
    var O = Object(this);
    var len = O.length >>> 0;
    var k = 0;
    while (k < len) {
      if (k in O) {
        callback.call(thisArg, O[k], k, O);
      }
      k++;
    }
  };
}
```

**Note**: jQuery's `each` method passes callback arguments in the opposite order from `forEach` — `index` first, then `elem`.
