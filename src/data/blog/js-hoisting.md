---
author: 陈广亮
pubDatetime: 2016-07-01T10:00:00+08:00
title: "深入理解函数声明提升与变量声明提升"
slug: js-hoisting
featured: false
draft: false
tags:
  - JavaScript
description: "通过两个例子深入理解 JS 的声明提升机制。"
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

第二个例子中，`function a() {}` 被提升到 `b()` 内部顶部，所以 `a = 10` 修改的是局部的 `a`，而非全局的。
