---
author: 陈广亮
pubDatetime: 2015-11-01T10:00:00+08:00
title: "JS 性能优化：记忆（memoization）"
slug: js-memoization
featured: false
draft: false
tags:
  - JavaScript
  - 性能优化
description: "函数记忆化技术，避免重复运算提升性能。"
---

函数可以将先前操作的结果记录在某个对象里，从而避免无谓的重复运算。

## 普通阶乘

```js
function factorial(n) {
  if (n == 0) return 1;
  return n * factorial(n - 1);
}

for (var i = 0; i < 10; i++) {
  factorial(i); // 共运行 55 次
}
```

## 带记忆的阶乘

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

## 通用 memoizer

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
