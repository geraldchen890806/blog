---
author: 陈广亮
pubDatetime: 2016-04-01T10:00:00+08:00
title: "null 与 undefined 的区别"
slug: null-vs-undefined
featured: false
draft: false
tags:
  - JavaScript
description: "详解 null 和 undefined 的定义、转义、判定和用法差异。"
---

## 定义

- `null`：关键字，表示"空值"，`typeof null` 返回 `"object"`
- `undefined`：预定义全局变量，`typeof undefined` 返回 `"undefined"`

## 转义

```js
!!null; // false
!!undefined; // false
Number(null); // 0
Number(undefined); // NaN
null == undefined; // true
null === undefined; // false
```

## 判定

```js
var isNull = function (obj) { return obj === null; };
var isUndefined = function (obj) { return obj === void 0; };
```

## undefined 的典型场景

1. 变量声明未赋值
2. 函数参数未提供
3. 对象属性未赋值
4. 函数无返回值
5. 解构赋值时触发默认值（`null` 不会触发默认值）

```js
const { a = "a", b = "b" } = { a: null };
// a → null, b → "b"
```
