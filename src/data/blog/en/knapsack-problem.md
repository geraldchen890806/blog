---
author: Gerald Chen
pubDatetime: 2016-07-15T10:00:00+08:00
title: "Solving the Knapsack Problem in JavaScript"
slug: knapsack-problem
featured: false
draft: true
tags:
  - JavaScript
  - 算法
description: "A dynamic programming solution to the 0/1 knapsack problem in JavaScript."
---

Given a list of items `[[weight, value], ...]` and a knapsack capacity of 10, find the maximum total value:

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
