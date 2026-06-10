---
author: Gerald Chen
pubDatetime: 2017-01-15T10:00:00+08:00
title: "Using the ES7 Rest/Spread Operator with Objects"
slug: es7-rest-spread
featured: false
draft: true
tags:
  - JavaScript
  - ES6
description: "Handy uses of object rest destructuring and the spread operator."
---

An ES7 proposal brings the Rest/Spread operator to objects:

```js
let { x, y, ...z } = { x: 1, y: 2, a: 3, b: 4 };
// x: 1, y: 2, z: { a: 3, b: 4 }
```

A pattern you see all the time in Redux:

```js
let state = { a: 1, b: 1 };
console.log({ ...state, b: 2 }); // {a: 1, b: 2}
// 等价于
Object.assign({}, state, { b: 2 });
```

The mechanics are simple: `{ ...state, b: 2 }` → `{ a: 1, b: 1, b: 2 }` → `{ a: 1, b: 2 }`
