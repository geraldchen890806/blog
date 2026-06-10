---
author: Gerald Chen
pubDatetime: 2015-09-15T10:00:00+08:00
title: "A Complete Guide to JS Array Methods"
slug: js-array-methods
featured: false
draft: true
tags:
  - JavaScript
description: "A detailed walkthrough of every JS array method — which ones mutate the original array and which ones don't."
---

## Stack and Queue Methods (Mutate the Original Array)

```js
// a = [1,2,3,4]
a.push(5, 6); // a: [1,2,3,4,5,6], 返回 6 (length)
a.pop(); // a: [1,2,3], 返回 4
a.unshift(5, 6); // a: [5,6,1,2,3,4], 返回 6
a.shift(); // a: [2,3,4], 返回 1
```

## Manipulation Methods

```js
a.concat([5]); // 不改变原数组，返回 [4,3,2,1,5]
a.slice(1); // 不改变原数组
a.splice(0, 1); // 改变原数组，删除操作
a.splice(1, 0, "a"); // 插入操作
a.splice(1, 1, "a", "b"); // 替换操作
```

## Iteration Methods (IE9+)

- `forEach` — no return value; equivalent to a for loop
- `every` — returns true only if every item returns true
- `some` — returns true if any item returns true
- `filter` — returns an array of the items for which the callback returns true
- `map` — returns an array of the values returned by each callback invocation

## Reduction Methods

```js
a = [1, 2, 3, 4];
a.reduce(function (prev, cur) {
  return prev + cur;
}, 5); // 15
```

**Summary**: methods that mutate the original array: `pop, push, shift, unshift, splice, reverse, sort`
