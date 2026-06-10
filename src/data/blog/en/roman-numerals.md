---
author: Gerald Chen
pubDatetime: 2016-05-01T10:00:00+08:00
title: "Parsing Roman Numerals"
slug: roman-numerals
featured: false
draft: true
tags:
  - JavaScript
  - 算法
description: "Converting between Roman numerals and Arabic numbers in JavaScript."
---

```js
var res = {
  M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90,
  L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1,
};

// 罗马数字 → 数字
function solution(s) {
  var v = 0;
  for (var i in res) {
    while (s.substr(0, i.length) == i) {
      s = s.substr(i.length);
      v += res[i];
    }
  }
  return v;
}

// 数字 → 罗马数字
function toRoman(v) {
  var s = "";
  for (var i in res) {
    while (v >= res[i]) {
      s += i;
      v -= res[i];
    }
  }
  return s;
}

solution("XXI"); // 21
toRoman(21); // "XXI"
```
