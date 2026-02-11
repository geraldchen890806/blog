---
author: 陈广亮
pubDatetime: 2015-03-10T10:00:00+08:00
title: "JS 实现排列组合数组"
slug: js-power-set
featured: false
draft: false
tags:
  - JavaScript
  - 算法
description: "使用 reduce 实现数组的排列组合（幂集）"
---

首先介绍个网站 [codewars](http://www.codewars.com/r/eVdvRA) 一个编码社区，做题升级跟玩游戏一样，在获得乐趣的同时还能得到很大的提升。

题目：写一个方法输出所有的可能的子数组，就是排列组合了

```js
power([1, 2, 3]); // => [[], [1], [2], [1, 2], [3], [1, 3], [2, 3], [1, 2, 3]]
```

大神的代码：

```js
function power(s) {
  return s.reduce(function (p, e) {
    return p.concat(
      p.map(function (sub) {
        return sub.concat([e]);
      })
    );
  }, [[]]);
}
```

每次循环取源数组一个数，对结果数组（初始化 `[[]]`）的每个子项做 concat，并添加到结果数组中：

```
[[]]
[[], [1]]
[[], [1], [2], [1,2]]
[[], [1], [2], [1,2], [3], [1,3], [2,3], [1,2,3]]
```
