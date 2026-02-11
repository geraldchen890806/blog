---
author: 陈广亮
pubDatetime: 2016-07-15T10:00:00+08:00
title: "背包问题 JS 实现"
slug: knapsack-problem
featured: false
draft: false
tags:
  - JavaScript
  - 算法
description: "0/1 背包问题的 JavaScript 动态规划实现。"
---

物品列表 `[[重量, 价值], ...]`，背包承重 10，求最大价值：

```js
var items = [
  [2, 5],
  [3, 1],
  [5, 4],
  [6, 10],
];

function knapsack(capacity, items) {
  var res = [];
  for (var i = 0; i <= capacity; i++) res[i] = 0;
  for (var i = 0; i < items.length; i++) {
    for (var j = capacity; j > items[i][0]; j--) {
      res[j] = Math.max(res[j], res[j - items[i][0]] + items[i][1]);
    }
  }
  return res[capacity];
}

knapsack(10, items); // 15
```
