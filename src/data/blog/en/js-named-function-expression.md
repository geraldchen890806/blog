---
author: Gerald Chen
pubDatetime: 2016-08-01T10:00:00+08:00
title: "Named vs. Anonymous Functions in JavaScript"
slug: js-named-function-expression
featured: false
draft: true
tags:
  - JavaScript
description: "How named function expressions and function declarations behave differently in scope."
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
