---
author: 陈广亮
pubDatetime: 2017-01-15T10:00:00+08:00
title: "ES7 Rest/Spread 运算符在对象中的应用"
slug: es7-rest-spread
featured: false
draft: false
tags:
  - JavaScript
  - ES6
description: "对象的 Rest 解构赋值和扩展运算符的妙用。"
---

ES7 提案将 Rest/Spread 运算符引入对象：

```js
let { x, y, ...z } = { x: 1, y: 2, a: 3, b: 4 };
// x: 1, y: 2, z: { a: 3, b: 4 }
```

在 Redux 中常见的用法：

```js
let state = { a: 1, b: 1 };
console.log({ ...state, b: 2 }); // {a: 1, b: 2}
// 等价于
Object.assign({}, state, { b: 2 });
```

原理很简单：`{ ...state, b: 2 }` → `{ a: 1, b: 1, b: 2 }` → `{ a: 1, b: 2 }`
