---
author: 陈广亮
pubDatetime: 2015-08-15T10:00:00+08:00
title: "JS 字符串去重的三种方法"
slug: js-dedup-string
featured: false
draft: false
tags:
  - JavaScript
  - 算法
description: "使用正则、hash、数组三种方式去除字符串中的重复单词。"
---

去除以空格分割的字符串重复部分。

## 方法一：正则去重

```js
function removeRepeat(str) {
  return str
    .replace(/(^|\s)(\S+)(?=\s(?:\S+\s)*\2(?:\s|$))/g, "")
    .trim();
}
removeRepeat("a b c a b e"); // "c a b e"
```

## 方法二：hash 去重

```js
function removeRepeat(str) {
  var obj = {}, set = "";
  str.replace(/\S+/g, function (w) {
    if (!obj[w]) {
      set += w + " ";
      obj[w] = 1;
    }
  });
  return set.trim();
}
removeRepeat("a b c a b e"); // "a b c e"
```

## 方法三：数组去重

```js
function removeRepeat(str) {
  var a = str.split(/\s+/g);
  a.sort();
  for (var i = a.length - 1; i > 0; --i) {
    if (a[i] == a[i - 1]) a.splice(i, 1);
  }
  return a.join(" ");
}
```
