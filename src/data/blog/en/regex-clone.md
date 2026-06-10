---
author: Gerald Chen
pubDatetime: 2015-12-15T10:00:00+08:00
title: "Cloning Regular Expressions and the lastIndex Property"
slug: regex-clone
featured: false
draft: true
tags:
  - JavaScript
  - 正则表达式
description: "When cloning a regular expression, don't forget the lastIndex property."
---

```js
RegExp.prototype.clone = function () {
  var ret = new RegExp(this);
  ret.lastIndex = this.lastIndex;
  return ret;
};
```

## The lastIndex Property

Only regexes with the global flag `g` have this property. It indicates the character position in the string where the next match attempt will start.

```js
var re = /te/g;
re.test("test"); // true, lastIndex: 2
re.test("test"); // false, lastIndex: 0（超出后重置）
re.test("test"); // true
```

When cloning a regular expression, you need to copy the `lastIndex` property as well, or the clone won't behave correctly.
