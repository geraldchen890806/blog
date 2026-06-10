---
author: Gerald Chen
pubDatetime: 2015-11-01T10:00:00+08:00
title: "JS Performance Optimization: Memoization"
slug: js-memoization
featured: false
draft: true
tags:
  - JavaScript
  - 性能优化
description: "Function memoization: cache results to avoid redundant computation and improve performance."
---

A function can record the results of previous operations in an object, avoiding pointless repeated computation.

## Plain Factorial

```js
function factorial(n) {
  if (n == 0) return 1;
  return n * factorial(n - 1);
}

for (var i = 0; i < 10; i++) {
  factorial(i); // 共运行 55 次
}
```

## Memoized Factorial

```js
var factorial = (function () {
  var cache = [1];
  var fac = function (n) {
    if (!cache.hasOwnProperty(n)) {
      cache[n] = n * fac(n - 1);
    }
    return cache[n];
  };
  return fac;
})();
// 共运行 19 次，直接调用 10 次 + 自调用 9 次
```

## A Generic Memoizer

```js
var memoizer = function (cache, fn) {
  cache = cache || [];
  var recur = function (n) {
    if (!cache.hasOwnProperty(n)) {
      cache[n] = fn(recur, n);
    }
    return cache[n];
  };
  return recur;
};

// 阶乘
var factorial = memoizer([1, 1], function (recur, n) {
  return n * recur(n - 1);
});

// 斐波那契
var fibonacci = memoizer([0, 1], function (recur, n) {
  return recur(n - 1) + recur(n - 2);
});
```
