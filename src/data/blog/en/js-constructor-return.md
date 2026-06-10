---
author: Gerald Chen
pubDatetime: 2015-10-15T10:00:00+08:00
title: "JS Function Return Values and the new Operator"
slug: js-constructor-return
featured: false
draft: true
tags:
  - JavaScript
description: "How a constructor's return value affects the instance created by the new operator."
---

## What the new Operator Does

1. Creates a new object
2. Binds the constructor's scope to the new object
3. Executes the code inside the constructor
4. Returns the new object

## How the Return Value Matters

If the return value is a primitive (String/Boolean/Number/Null/Undefined), it has **no effect** on the result of `new`:

```js
function T() {
  this.a = 1;
  return 1; // 不影响
}
new T(); // T {a: 1}
```

If the return value is a reference type (Object/Array/Date/RegExp/Function), `new` returns that value instead:

```js
function T() {
  this.a = 1;
  return new Date();
}
new T(); // Date 对象，不是 T 的实例
```

**Watch out**: `new Boolean(true)`, `new Number(1)`, and `new String("a")` are objects too!

```js
function T() {
  this.a = 1;
  return new Boolean(true);
}
new T(); // Boolean {true}，不是 T 的实例
```
