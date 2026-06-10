---
author: Gerald Chen
pubDatetime: 2016-08-15T10:00:00+08:00
title: "The Pitfall of JavaScript's with Keyword"
slug: js-with-keyword
featured: false
draft: true
tags:
  - JavaScript
description: "with creates a new lexical scope, which can leak variables into the global scope."
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

`with` creates a new lexical scope at its location, but it does not add new properties to the target object. It is a complete no-op in strict mode and is best avoided.
