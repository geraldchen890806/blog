---
author: 陈广亮
pubDatetime: 2019-08-10T10:00:00+08:00
title: "函数作用域和块作用域"
slug: function-scope-block-scope
featured: false
draft: false
tags:
  - JavaScript
description: "最小暴露原则、IIFE、块作用域（let/const/try-catch）详解。"
---

## 最小暴露原则

应该最小限度地暴露必要内容，将其他内容"隐藏"起来。

## IIFE 的特殊用途

### 重置 undefined（ES3 中 undefined 可以赋值）

```js
(function IIFE(undefined) {
  var a;
  if (a === undefined) {
    console.log("Undefined is safe here!");
  }
})();
```

## 块作用域

- `try/catch` 的 catch 分句会创建块作用域
- `let` 将变量绑定到所在的 `{}` 块中
- `const` 创建块级常量

```js
if (true) {
  {
    let i = 11;
    var s = 11;
  }
  // console.log(i); // ReferenceError
  console.log(s); // 11
}
```

块作用域有助于垃圾回收——闭包不会意外保留大对象。
