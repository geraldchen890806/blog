---
author: 陈广亮
pubDatetime: 2016-03-01T10:00:00+08:00
title: "JS 判断浏览器是否支持严格模式"
slug: js-strict-mode-check
featured: false
draft: false
tags:
  - JavaScript
description: "利用严格模式下 this 为 undefined 的特性来判断。"
---

严格模式中函数内 `this` 为 `undefined`：

```js
var hasStrictMode = (function () {
  "use strict";
  return this == undefined;
})();
```

另外，一个忽略 new 操作符的技巧：

```js
function P() {
  if (!(this instanceof P)) return new P();
}
```
