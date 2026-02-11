---
author: 陈广亮
pubDatetime: 2016-03-15T10:00:00+08:00
title: ES6 Generator 与 co 模块
slug: es6-generator-and-co
featured: false
draft: false
tags:
  - JavaScript
  - ES6
description: 理解 ES6 Generator 的基本特性以及 tj 大神的 co 模块原理。
---

## Generator 特性

举个例子：

```js
function* foo() {
  yield 4;
  var res = yield 2;
  console.log("res:", res);
  return 5;
}

var g = foo();
g.next(1); // { value: 4, done: false }
g.next(2); // { value: 2, done: false }
g.next(3); // res:3 { value: 5, done: true }
```

几点注意：

1. 调用 `foo()` 时，函数体中的逻辑并不会执行，直到调用 `g.next()` 时才会执行
2. 调用 `g.next()` 时返回 `{ value: *, done: * }`
3. 当 `done` 为 `false` 时，表示函数逻辑还未执行完
4. 最后一次返回 `return` 语句的结果，`done` 为 `true`
5. `var res = yield 2` 这句只执行了后面半段就暂停了，等到再次调用 `g.next(3)` 时才会将参数赋给 `res`

## co 模块原理

tj 大神的 co 模块就是建立在这些特性上的，核心思想是：

1. Generator 函数中 yield 一个异步操作
2. 异步操作完成后，将结果通过 `next()` 传回 Generator
3. 递归执行直到 Generator 完成

这种模式让异步代码看起来像同步代码，后来 ES7 的 `async/await` 正是基于这个思想的语法糖。
