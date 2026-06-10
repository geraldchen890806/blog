---
author: Gerald Chen
pubDatetime: 2019-09-15T10:00:00+08:00
title: "Symbol.toPrimitive and Addition in JavaScript"
slug: symbol-toprimitive
featured: false
draft: true
tags:
  - JavaScript
  - ES6
description: "A deep dive into Symbol.toPrimitive, object-to-primitive conversion, and the mystery behind [] + {}."
---

## Symbol.toPrimitive

```js
var obj = {
  [Symbol.toPrimitive](hint) {
    if (hint == "number") return 10;
    if (hint == "string") return "hello";
    return true;
  },
};

+obj; // 10 (hint: "number")
`${obj}`; // "hello" (hint: "string")
obj + ""; // "true" (hint: "default")
```

## `[] + {}` vs `{} + []`

```js
[] + {};
// [].toString() + {}.toString() → "" + "[object Object]" → "[object Object]"

{} + [];
// {} 被解析为代码块，变成 +[] → +("") → 0
```

So `{} + [] != [] + {}` (`0 != "[object Object]"`).
