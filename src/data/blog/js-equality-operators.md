---
author: 陈广亮
pubDatetime: 2015-08-01T10:00:00+08:00
title: "JS 运算符 == 与 ==="
slug: js-equality-operators
featured: false
draft: false
tags:
  - JavaScript
description: "深入理解 JS 中 == 和 === 的区别与类型转换规则。"
---

## `==` 运算符规则

1. 如果有一个操作数是布尔值，则先转换为数值：`false → 0, true → 1`
2. 如果一个操作数为字符串，另一个为数值，则将字符串用 `Number()` 转换
3. 如果一个操作数是对象，另一个不是，则调用对象的 `valueOf()` 方法

```js
true == 1; // true
"1" == 1; // true (Number("1") == 1)
"1a" == 1; // false (Number("1a") → NaN)
```

## 特殊规则

1. `null == undefined` → `true`
2. `null` 和 `undefined` 比较前不转换
3. 如果有一个操作数是 `NaN` 则恒返回 `false`
4. 如果两个操作数都是对象，则比较是否是同一个引用

```js
new Boolean(true) == true; // true (调用 valueOf)
new Boolean(true) == new Boolean(true); // false (不同对象)
```

## `===`

不进行类型转换，直接比较值和类型。
