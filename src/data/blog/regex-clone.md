---
author: 陈广亮
pubDatetime: 2015-12-15T10:00:00+08:00
title: "正则表达式的复制与 lastIndex"
slug: regex-clone
featured: false
draft: false
tags:
  - JavaScript
  - 正则表达式
description: "复制正则表达式时需要注意 lastIndex 属性。"
---

```js
RegExp.prototype.clone = function () {
  var ret = new RegExp(this);
  ret.lastIndex = this.lastIndex;
  return ret;
};
```

## lastIndex 属性

只有设置了全局标志 `g` 的正则才有这个属性，表示从字符串的第几个字符开始匹配。

```js
var re = /te/g;
re.test("test"); // true, lastIndex: 2
re.test("test"); // false, lastIndex: 0（超出后重置）
re.test("test"); // true
```

复制正则表达式时需要复制 `lastIndex` 属性，否则会影响使用。
