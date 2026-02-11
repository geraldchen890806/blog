---
author: 陈广亮
pubDatetime: 2019-09-15T10:00:00+08:00
title: "Symbol.toPrimitive 与 JS 加法运算"
slug: symbol-toprimitive
featured: false
draft: false
tags:
  - JavaScript
  - ES6
description: "深入理解 Symbol.toPrimitive、对象到原始值的转换，以及 [] + {} 的奥秘。"
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

所以 `{} + [] != [] + {}`（`0 != "[object Object]"`）。
