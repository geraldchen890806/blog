---
author: 陈广亮
pubDatetime: 2016-02-15T10:00:00+08:00
title: "JS 类型转换：对象转原始值"
slug: js-type-conversion
featured: false
draft: false
tags:
  - JavaScript
description: "深入理解 JS 中对象转换成原始值的过程。"
---

对象转换成原始值的过程：

1. 如果对象有 `valueOf()` 方法并返回原始值，则调用
2. 否则调用 `toString()` 方法
3. 否则抛出类型异常

```js
function T() {}
T.prototype.valueOf = function () {
  return "a";
};
new T() == "a"; // true

T.prototype.valueOf = function () {
  return {};
};
T.prototype.toString = function () {
  return "b";
};
new T() == "b"; // true
```

**注意**：Date 类型转换成原始值只使用 `toString()` 方法。
