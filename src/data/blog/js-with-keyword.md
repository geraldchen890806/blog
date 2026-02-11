---
author: 陈广亮
pubDatetime: 2016-08-15T10:00:00+08:00
title: "JS with 关键字的坑"
slug: js-with-keyword
featured: false
draft: false
tags:
  - JavaScript
description: "with 创建新的词法作用域，可能导致变量泄漏到全局。"
---

```js
function foo(obj) {
  with (obj) {
    a = 2;
  }
}

var o1 = { a: 3 };
var o2 = { b: 3 };

foo(o1);
console.log(o1.a); // 2

foo(o2);
console.log(o2.a); // undefined
console.log(a); // 2 — a 泄漏到全局！
```

`with` 在当前位置建立一个新的词法作用域，不会在目标对象中新建属性。严格模式下完全不起作用，不建议使用。
