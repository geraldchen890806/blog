---
author: 陈广亮
pubDatetime: 2015-10-15T10:00:00+08:00
title: "JS 函数返回值与 new 操作符"
slug: js-constructor-return
featured: false
draft: false
tags:
  - JavaScript
description: "构造函数返回值对 new 操作符创建实例的影响。"
---

## new 操作符的步骤

1. 创建一个新对象
2. 将构造函数的作用域赋给新对象
3. 执行构造函数中的代码
4. 返回新对象

## 返回值的影响

如果返回值是原始类型（String/Boolean/Number/Null/Undefined），**不影响** new 的结果：

```js
function T() {
  this.a = 1;
  return 1; // 不影响
}
new T(); // T {a: 1}
```

如果返回值是引用类型（Object/Array/Date/RegExp/Function），new 返回的就是该返回值：

```js
function T() {
  this.a = 1;
  return new Date();
}
new T(); // Date 对象，不是 T 的实例
```

**特别注意**：`new Boolean(true)`、`new Number(1)`、`new String("a")` 也是对象！

```js
function T() {
  this.a = 1;
  return new Boolean(true);
}
new T(); // Boolean {true}，不是 T 的实例
```
