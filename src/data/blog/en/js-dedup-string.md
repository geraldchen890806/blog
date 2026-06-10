---
author: Gerald Chen
pubDatetime: 2015-08-15T10:00:00+08:00
title: "Three Ways to Remove Duplicate Words from a String in JavaScript"
slug: js-dedup-string
featured: false
draft: true
tags:
  - JavaScript
  - 算法
description: "Remove duplicate words from a space-separated string using a regex, a hash, or an array."
---

The goal: remove duplicate words from a space-separated string.

## Method 1: Regex

```js
function removeRepeat(str) {
  return str
    .replace(/(^|\s)(\S+)(?=\s(?:\S+\s)*\2(?:\s|$))/g, "")
    .trim();
}
removeRepeat("a b c a b e"); // "c a b e"
```

## Method 2: Hash

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

## Method 3: Array

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
