---
author: Gerald Chen
pubDatetime: 2015-11-15T10:00:00+08:00
title: "A Neat for-Loop Trick in JavaScript"
slug: js-for-loop-trick
featured: false
draft: true
tags:
  - JavaScript
description: "A clever use of the for loop in the Object.keys polyfill."
---

`Object.keys` returns all enumerable properties of an object. Here's a polyfill that covers IE8 and below:

```js
Object.keys =
  Object.keys ||
  function (obj) {
    var a = [];
    for (a[a.length] in obj);
    return a;
  };
```

`for (a[a.length] in obj)` — on each iteration, the property name is assigned to `a[a.length]`, which automatically appends it to the end of the array.

As a side note, `Object.getOwnPropertyNames(obj)` returns all own properties, enumerable or not:

```js
Array.test = function () {};
Object.keys(Array); // ["test"]
Object.getOwnPropertyNames(Array); // ["length", "name", ..., "test"]
```
