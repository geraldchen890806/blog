---
author: Gerald Chen
pubDatetime: 2015-08-01T10:00:00+08:00
title: "JS Operators: == vs ==="
slug: js-equality-operators
featured: false
draft: true
tags:
  - JavaScript
description: "A deep dive into the difference between == and === in JavaScript and the type coercion rules behind them."
---

## How `==` works

1. If one operand is a boolean, it is first converted to a number: `false → 0, true → 1`
2. If one operand is a string and the other is a number, the string is converted with `Number()`
3. If one operand is an object and the other is not, the object's `valueOf()` method is called

```js
true == 1; // true
"1" == 1; // true (Number("1") == 1)
"1a" == 1; // false (Number("1a") → NaN)
```

## Special cases

1. `null == undefined` → `true`
2. `null` and `undefined` are not converted before comparison
3. If either operand is `NaN`, the result is always `false`
4. If both operands are objects, they are compared by reference identity

```js
new Boolean(true) == true; // true (调用 valueOf)
new Boolean(true) == new Boolean(true); // false (不同对象)
```

## `===`

No type coercion — it compares both value and type directly.
