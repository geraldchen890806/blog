---
author: Gerald Chen
pubDatetime: 2016-07-01T10:00:00+08:00
title: "Understanding Function and Variable Hoisting in JavaScript"
slug: js-hoisting
featured: false
draft: true
tags:
  - JavaScript
description: "Two examples that get to the heart of how hoisting works in JavaScript."
---

```js
var foo = 1;
(function () {
  console.log(foo); // undefined（变量提升）
  var foo = 2;
})();
```

```js
var a = 1;
function b() {
  a = 10;
  return;
  function a() {} // 函数声明提升，a 变成局部变量
}
b();
alert(a); // 1
```

In the second example, `function a() {}` is hoisted to the top of `b()`, so `a = 10` assigns to the local `a`, not the global one.
