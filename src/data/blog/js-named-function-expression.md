---
author: 陈广亮
pubDatetime: 2016-08-01T10:00:00+08:00
title: "JS 具名函数与匿名函数的差异"
slug: js-named-function-expression
featured: false
draft: false
tags:
  - JavaScript
description: "具名函数表达式与函数声明在作用域中的不同行为。"
---

```js
// 具名函数表达式：A 在内部是只读的
(function A() {
  console.log(A); // [Function A]
  A = 1;
  console.log(window.A); // undefined
  console.log(A); // [Function A]  （赋值无效）
})();

// 函数声明
function A() {
  console.log(A); // [Function A]
  A = 1;
  console.log(window.A); // 1
  console.log(A); // 1
}
A();
```
