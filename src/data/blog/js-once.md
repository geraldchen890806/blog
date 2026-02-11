---
author: 陈广亮
pubDatetime: 2015-05-10T10:00:00+08:00
title: "实现 once 函数"
slug: js-once
featured: false
draft: false
tags:
  - JavaScript
description: "用闭包实现只能调用一次的函数。"
---

写一个函数，可以生成只能调用一次的函数——一个简单的闭包应用。

```js
logOnce = once(console.log);
logOnce("foo"); // -> "foo"
logOnce("bar"); // -> no effect
```

实现：

```js
function once(fn) {
  var flag = true;
  return function () {
    if (flag) {
      flag = false;
      return fn.apply(this, arguments);
    }
    return;
  };
}
```
