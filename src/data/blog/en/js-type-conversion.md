---
author: Gerald Chen
pubDatetime: 2016-02-15T10:00:00+08:00
title: "JS Type Conversion: From Objects to Primitives"
slug: js-type-conversion
featured: false
draft: true
tags:
  - JavaScript
description: "A close look at how JavaScript converts objects into primitive values."
---

When JavaScript converts an object to a primitive value, it follows these steps:

1. If the object has a `valueOf()` method that returns a primitive, that result is used
2. Otherwise, `toString()` is called
3. Otherwise, a TypeError is thrown

```js
function T() {}
T.prototype.valueOf = function () {
  return "a";
};
new T() == "a"; // true

T.prototype.valueOf = function () {
  return {};
};
T.prototype.toString = function () {
  return "b";
};
new T() == "b"; // true
```

**Note**: When a Date object is converted to a primitive, only its `toString()` method is used.
