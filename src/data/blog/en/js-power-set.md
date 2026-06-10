---
author: Gerald Chen
pubDatetime: 2015-03-10T10:00:00+08:00
title: "Generating the Power Set of an Array in JavaScript"
slug: js-power-set
featured: false
draft: true
tags:
  - JavaScript
  - 算法
description: "Building all combinations of an array (the power set) with reduce"
---

First, a quick shout-out to [codewars](http://www.codewars.com/r/eVdvRA), a coding community where solving challenges to level up feels like playing a game — it's fun, and you learn a lot along the way.

The challenge: write a function that returns all possible subarrays of an array — in other words, the power set.

```js
power([1, 2, 3]); // => [[], [1], [2], [1, 2], [3], [1, 3], [2, 3], [1, 2, 3]]
```

A brilliant solution from another user:

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

On each iteration, it takes one element from the source array, concats it onto every subarray in the accumulator (initialized as `[[]]`), and appends the results back to the accumulator:

```
[[]]
[[], [1]]
[[], [1], [2], [1,2]]
[[], [1], [2], [1,2], [3], [1,3], [2,3], [1,2,3]]
```
