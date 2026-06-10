---
author: Gerald Chen
pubDatetime: 2015-03-15T10:00:00+08:00
title: "The Evolution of the JS repeat Method"
slug: js-repeat
featured: false
draft: true
tags:
  - JavaScript
description: "Multiple implementations of string repetition, from join to binary recursion."
---

The repeat method: repeat a string N times, e.g. `repeat("ruby", 2)` returns `rubyruby`.

## Version 1: join on an empty array

```js
function repeat(target, n) {
  return new Array(n + 1).join(target);
}
```

## Version 2: array-like object + call

```js
function repeat(target, n) {
  return Array.prototype.join.call({ length: n + 1 }, target);
}
```

## Version 3: closure caching

```js
var repeat = (function () {
  var join = Array.prototype.join,
    obj = {};
  return function (target, n) {
    obj.length = n + 1;
    return join.call(obj, target);
  };
})();
```

## Version 4: binary doubling

```js
function repeat(target, n) {
  var s = target,
    total = [];
  while (n > 0) {
    if (n % 2 == 1) total[total.length] = s;
    if (n == 1) break;
    s += s;
    n = n >> 1;
  }
  return total.join("");
}
```

## Version 7: recursion (the best approach)

```js
function repeat(target, n) {
  if (n == 1) return target;
  var s = repeat(target, Math.floor(n / 2));
  s += s;
  if (n % 2) s += target;
  return s;
}
```
