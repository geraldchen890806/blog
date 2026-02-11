---
author: 陈广亮
pubDatetime: 2015-03-15T10:00:00+08:00
title: "JS repeat 方法的演变历史"
slug: js-repeat
featured: false
draft: false
tags:
  - JavaScript
description: "字符串重复方法的多种实现，从 join 到二分法递归。"
---

repeat 方法：将一个字符串重复自身 N 次，如 `repeat("ruby", 2)` 得到 `rubyruby`。

## 版本1：利用空数组 join

```js
function repeat(target, n) {
  return new Array(n + 1).join(target);
}
```

## 版本2：类数组对象 + call

```js
function repeat(target, n) {
  return Array.prototype.join.call({ length: n + 1 }, target);
}
```

## 版本3：闭包缓存

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

## 版本4：二分法

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

## 版本7：递归（上乘方案）

```js
function repeat(target, n) {
  if (n == 1) return target;
  var s = repeat(target, Math.floor(n / 2));
  s += s;
  if (n % 2) s += target;
  return s;
}
```
