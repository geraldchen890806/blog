---
author: Gerald Chen
pubDatetime: 2016-09-15T10:00:00+08:00
title: "Common Mistakes We Make with Promises"
slug: promises-problem
featured: false
draft: true
tags:
  - JavaScript
description: "The differences between four ways of writing Promise then."
---

Here are four different ways of chaining Promises—can you tell them apart?

```js
// 1. 返回新 Promise
doSomething().then(function () {
  return doSomethingElse();
});

// 2. 忽略返回值
doSomething().then(function () {
  doSomethingElse();
});

// 3. 立即执行
doSomething().then(doSomethingElse());

// 4. 传递函数引用
doSomething().then(doSomethingElse);
```

Recommended reading:
- [Chinese translation](http://fex.baidu.com/blog/2015/07/we-have-a-problem-with-promises/)
- [Original article](http://pouchdb.com/2015/05/18/we-have-a-problem-with-promises.html)
