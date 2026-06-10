---
author: Gerald Chen
pubDatetime: 2016-04-01T10:00:00+08:00
title: "The Difference Between null and undefined"
slug: null-vs-undefined
featured: false
draft: true
tags:
  - JavaScript
description: "A close look at how null and undefined differ in definition, coercion, detection, and usage."
---

## Definitions

- `null`: a keyword that represents an "empty value"; `typeof null` returns `"object"`
- `undefined`: a predefined global variable; `typeof undefined` returns `"undefined"`

## Coercion

```js
!!null; // false
!!undefined; // false
Number(null); // 0
Number(undefined); // NaN
null == undefined; // true
null === undefined; // false
```

## Detection

```js
var isNull = function (obj) { return obj === null; };
var isUndefined = function (obj) { return obj === void 0; };
```

## Where undefined typically shows up

1. A variable is declared but never assigned
2. A function argument is not provided
3. An object property has not been set
4. A function returns nothing
5. Default values kick in during destructuring (`null` does not trigger defaults)

```js
const { a = "a", b = "b" } = { a: null };
// a → null, b → "b"
```
