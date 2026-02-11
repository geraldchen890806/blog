---
author: 陈广亮
pubDatetime: 2015-09-15T10:00:00+08:00
title: "JS Array 方法大全"
slug: js-array-methods
featured: false
draft: false
tags:
  - JavaScript
description: "详解 JS 数组的所有方法，哪些会改变原数组，哪些不会。"
---

## 栈、队列方法（改变原数组）

```js
// a = [1,2,3,4]
a.push(5, 6); // a: [1,2,3,4,5,6], 返回 6 (length)
a.pop(); // a: [1,2,3], 返回 4
a.unshift(5, 6); // a: [5,6,1,2,3,4], 返回 6
a.shift(); // a: [2,3,4], 返回 1
```

## 操作方法

```js
a.concat([5]); // 不改变原数组，返回 [4,3,2,1,5]
a.slice(1); // 不改变原数组
a.splice(0, 1); // 改变原数组，删除操作
a.splice(1, 0, "a"); // 插入操作
a.splice(1, 1, "a", "b"); // 替换操作
```

## 迭代方法（IE9+）

- `forEach` — 无返回值，相当于 for 循环
- `every` — 每一项都返回 true，则返回 true
- `some` — 任一项返回 true，则返回 true
- `filter` — 返回函数返回 true 的项组成的数组
- `map` — 返回每次函数调用返回值组成的数组

## 归并方法

```js
a = [1, 2, 3, 4];
a.reduce(function (prev, cur) {
  return prev + cur;
}, 5); // 15
```

**总结**：会改变原数组的方法：`pop, push, shift, unshift, splice, reverse, sort`
