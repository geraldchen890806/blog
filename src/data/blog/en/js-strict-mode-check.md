---
author: Gerald Chen
pubDatetime: 2016-03-01T10:00:00+08:00
title: "Detecting Strict Mode Support in JavaScript"
slug: js-strict-mode-check
featured: false
draft: true
tags:
  - JavaScript
description: "Use the fact that this is undefined in strict mode to detect support."
---

In strict mode, `this` inside a function is `undefined`:

```js
var hasStrictMode = (function () {
  "use strict";
  return this == undefined;
})();
```

As a bonus, here's a trick that makes the `new` operator optional:

```js
function P() {
  if (!(this instanceof P)) return new P();
}
```
