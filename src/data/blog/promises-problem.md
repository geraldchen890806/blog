---
author: 陈广亮
pubDatetime: 2016-09-15T10:00:00+08:00
title: "我们在使用 Promises 时常犯的错误"
slug: promises-problem
featured: false
draft: false
tags:
  - JavaScript
description: "四种 Promise then 写法的区别。"
---

下面四种 Promise 写法的区别：

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

推荐阅读：
- [中文版](http://fex.baidu.com/blog/2015/07/we-have-a-problem-with-promises/)
- [原文](http://pouchdb.com/2015/05/18/we-have-a-problem-with-promises.html)
